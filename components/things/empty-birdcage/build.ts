import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul, score } from '@conjure/kit';

type P = [number, number, number];

export default defineThing({
  questions: {
    occupant: choice('Who is in the cage?', {
      empty: 'Nobody: the swing hangs still and the seed has gone stale.',
      budgie: 'A single budgie, hopping between perch and swing.',
      covered: 'It cannot be seen: a cloth is draped over the cage as if it were night.',
      feather: 'Nobody now, but one small feather still lies on the cage floor.',
    }),
    door: noul('Is the cage door standing open?'),
    shape: choice('What shape is the cage?', {
      dome: 'A round cage with a hemispherical dome, the classic.',
      bell: 'A tall narrow cage rising to a pointed onion top, Victorian.',
      house: 'A rectangular cage with a pitched roof like a little house.',
    }),
    stand: choice('How is it held up?', {
      hanging: 'Hung from the hook of a tall floor stand with a curved arm.',
      pedestal: 'Sitting on top of a slim pedestal pole.',
      table: 'Set on a small round side table with a lace doily.',
    }),
    finish: choice('What is the wire like?', {
      brass: 'Polished brass, warm and old-fashioned.',
      white: 'White enamel, a little chipped.',
      chrome: 'Bright chrome with a plastic base, 1970s pet shop.',
      black: 'Black wrought iron.',
      pastel: 'Painted a nursery pastel.',
    }),
    bird: choice('If there is a budgie, what colour is it?', {
      green: 'Wild-type green with a yellow head and scalloped black wings.',
      blue: 'Sky blue with a white face.',
      yellow: 'Pure buttercup yellow.',
      grey: 'Soft grey and white.',
    }),
    cloth: choice('If the cage is covered, with what?', {
      teatowel: 'A red checked tea towel.',
      velvet: 'A heavy dark green velvet cover with a fringe.',
      floral: 'A faded floral pillowcase.',
      blanket: 'A crocheted blanket of bright squares.',
    }),
    toys: choice('What hangs inside besides the swing?', {
      bare: 'Nothing else, just the perch.',
      mirror: 'A little round mirror with a bell under it.',
      millet: 'A spray of millet clipped to the bars.',
      ladder: 'A plastic ladder and a ball with a bell in it.',
    }),
    husks: score('How much seed husk has been scattered?', ['None, scrubbed clean', 'A dusting on the cage floor', 'Husks flung out onto the floor below', 'A drift of husks and grit under the stand']),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const r = (lo: number, hi: number) => lo + (hi - lo) * random();
    const cage = new THREE.Group();
    s.root.add(cage);
    const into = <T extends THREE.Object3D>(node: T, parent: THREE.Object3D = cage) => { node.removeFromParent(); parent.add(node); return node; };

    const pastel = mood.cheer > 0.5 ? '#f0b6c4' : '#a9d6c4';
    const wireColour = { brass: '#c9a24a', white: '#eeece4', chrome: '#d5dadd', black: '#222325', pastel }[a.finish];
    const metallic = a.finish === 'brass' || a.finish === 'chrome';
    const wire = s.material(wireColour, { metalness: metallic ? 0.85 : 0.1, roughness: metallic ? 0.3 : 0.55 });
    const trayColour = { brass: '#b8923f', white: '#e4e1d6', chrome: mood.cheer > 0.5 ? '#e2573d' : '#3f78b8', black: '#222325', pastel }[a.finish];
    const tray = s.material(trayColour, { metalness: a.finish === 'brass' ? 0.8 : 0.05, roughness: 0.4 });

    const round = a.shape !== 'house';
    const R = a.shape === 'bell' ? 0.16 : 0.2;
    const W = 0.4, D = 0.26;
    const wall = a.shape === 'bell' ? 0.42 : a.shape === 'dome' ? 0.3 : 0.3;
    const roof = a.shape === 'bell' ? 0.26 : a.shape === 'dome' ? R : 0.13;
    const floorY = 0.05, eave = floorY + wall, peak = eave + roof;
    const front = round ? R : D / 2;
    const gauge = 0.0028;

    // Tray and floor paper.
    if (round) {
      into(s.cylinder(R + 0.012, R + 0.004, floorY, [0, floorY / 2, 0], tray, 28));
      into(s.cylinder(R - 0.006, R - 0.006, 0.004, [0, floorY + 0.001, 0], s.material('#d8cfb4', { roughness: 1 }), 24));
    } else {
      into(s.box([W + 0.024, floorY, D + 0.024], [0, floorY / 2, 0], tray));
      into(s.box([W - 0.01, 0.004, D - 0.01], [0, floorY + 0.001, 0], s.material('#d8cfb4', { roughness: 1 })));
    }
    into(s.box([0.1, 0.012, 0.012], [0, floorY * 0.5, front + 0.014], wire));

    // Wires are instances of one thin stick.
    const sticks: { from: P; to: P; radius?: number }[] = [];
    const doorHalf = 0.05, doorTop = floorY + 0.19;
    if (round) {
      const count = a.shape === 'bell' ? 24 : 30;
      for (let i = 0; i < count; i++) {
        const angle = (i / count) * Math.PI * 2;
        const x = Math.cos(angle) * R, z = Math.sin(angle) * R;
        const inDoor = z > 0 && Math.abs(x) < doorHalf - 0.004;
        sticks.push({ from: [x, inDoor ? doorTop : floorY, z], to: [x, eave, z] });
      }
      for (let i = 0; i < count / 2; i++) {
        const arc = into(s.ring(R, gauge, [0, eave, 0], wire, Math.PI));
        arc.rotation.y = (i / (count / 2)) * Math.PI;
        arc.scale.y = roof / R;
      }
      for (const y of [floorY + 0.004, doorTop + 0.006, eave]) into(s.ring(R, gauge * 1.5, [0, y, 0], wire)).rotation.x = Math.PI / 2;
      if (a.shape === 'bell') into(s.ring(R * 0.62, gauge * 1.3, [0, eave + roof * 0.78, 0], wire)).rotation.x = Math.PI / 2;
    } else {
      const corners: [number, number][] = [[-W / 2, -D / 2], [W / 2, -D / 2], [W / 2, D / 2], [-W / 2, D / 2]];
      for (let e = 0; e < 4; e++) {
        const [x0, z0] = corners[e], [x1, z1] = corners[(e + 1) % 4];
        const count = e % 2 === 0 ? 16 : 10;
        for (let i = 0; i < count; i++) {
          const t = i / count, x = mix(x0, x1, t), z = mix(z0, z1, t);
          const inDoor = z > D / 2 - 0.001 && Math.abs(x) < doorHalf - 0.004;
          sticks.push({ from: [x, inDoor ? doorTop : floorY, z], to: [x, eave, z] });
          if (e % 2 === 0) sticks.push({ from: [x, eave, z], to: [x, peak, 0] });
        }
        for (const y of [floorY + 0.004, doorTop + 0.006, eave]) sticks.push({ from: [x0, y, z0], to: [x1, y, z1], radius: gauge * 1.5 });
      }
      sticks.push({ from: [-W / 2, peak, 0], to: [W / 2, peak, 0], radius: gauge * 1.6 });
      for (const x of [-W / 2, W / 2]) for (const z of [-D / 2, D / 2]) sticks.push({ from: [x, eave, z], to: [x, peak, 0], radius: gauge * 1.5 });
      for (const x of [-W / 2, W / 2]) for (let i = 1; i < 5; i++) { const z = mix(-D / 2, D / 2, i / 5); sticks.push({ from: [x, eave, z], to: [x, eave + roof * (1 - Math.abs(z) / (D / 2)), z] }); }
    }
    // Door: a small barred frame on a side hinge.
    const door = new THREE.Group();
    door.position.set(-doorHalf, 0, front + 0.004);
    const leaf: { from: P; to: P; radius?: number }[] = [];
    for (let i = 0; i <= 4; i++) leaf.push({ from: [i * doorHalf / 2, floorY + 0.012, 0], to: [i * doorHalf / 2, doorTop - 0.004, 0], radius: i % 4 === 0 ? gauge * 1.5 : gauge });
    for (const y of [floorY + 0.012, doorTop - 0.004]) leaf.push({ from: [0, y, 0], to: [doorHalf * 2, y, 0], radius: gauge * 1.5 });
    door.rotation.y = a.door ? -r(1.5, 2.2) : 0;
    cage.add(door);

    const unit = new THREE.CylinderGeometry(1, 1, 1, 5);
    unit.translate(0, 0.5, 0);
    const up = new THREE.Vector3(0, 1, 0), m = new THREE.Matrix4(), q = new THREE.Quaternion();
    const weave = (parts: typeof sticks, parent: THREE.Object3D) => {
      const mesh = new THREE.InstancedMesh(unit, wire, parts.length);
      parts.forEach((part, index) => {
        const from = new THREE.Vector3(...part.from), span = new THREE.Vector3(...part.to).sub(from);
        q.setFromUnitVectors(up, span.clone().normalize());
        m.compose(from, q, new THREE.Vector3(part.radius ?? gauge, span.length(), part.radius ?? gauge));
        mesh.setMatrixAt(index, m);
      });
      mesh.castShadow = true;
      parent.add(mesh);
    };
    weave(sticks, cage);
    weave(leaf, door);
    into(s.ball([0.012, 0.012, 0.012], [0, peak + 0.012, 0], wire, 10));
    into(s.ring(0.02, 0.004, [0, peak + 0.04, 0], wire));

    // Furniture: perch, swing, dishes, cuttlebone.
    const dowel = s.material('#c9a871', { roughness: 0.8 });
    const span = round ? R : W / 2;
    const perchY = floorY + 0.11;
    into(s.rod([-span, perchY, 0.02], [span, perchY, 0.02], 0.006, dowel));
    const swing = new THREE.Group();
    const swingTop = round ? eave + roof * 0.85 : peak;
    const swingY = floorY + wall * 0.62;
    swing.position.set(0, swingTop, -0.03);
    for (const x of [-0.04, 0.04]) into(s.rod([x, 0, 0], [x, swingY - swingTop, 0], 0.0018, wire), swing);
    into(s.rod([-0.055, swingY - swingTop, 0], [0.055, swingY - swingTop, 0], 0.006, dowel), swing);
    cage.add(swing);
    const cupTint = s.material(mood.cheer > 0.5 ? '#f2d23a' : '#e9e5d8', { roughness: 0.4 });
    for (const side of [-1, 1]) {
      const cup = into(s.cylinder(0.03, 0.024, 0.035, [side * (span - 0.035), perchY - 0.03, round ? 0.05 : D / 2 - 0.04], cupTint, 12));
      into(s.cylinder(0.026, 0.026, 0.004, [0, 0.014, 0], s.material(side < 0 ? '#c9b27a' : '#9fc4d6', { roughness: side < 0 ? 1 : 0.1 }), 12), cup);
    }
    const bone = into(s.ball([0.022, 0.06, 0.008], [round ? -R * 0.62 : -W / 2 + 0.06, floorY + wall * 0.6, round ? -R * 0.76 : -D / 2 + 0.012], s.material('#f3efe2', { roughness: 0.9 }), 12));
    bone.rotation.set(0, round ? 0.7 : 0, r(-0.2, 0.2));

    if (a.toys === 'mirror') {
      const x = round ? R * 0.55 : W / 2 - 0.08, z = round ? -R * 0.8 : -D / 2 + 0.012;
      into(s.cylinder(0.035, 0.035, 0.006, [x, floorY + wall * 0.62, z], s.material('#e2573d', { roughness: 0.4 }), 16)).rotation.x = Math.PI / 2;
      into(s.cylinder(0.028, 0.028, 0.007, [x, floorY + wall * 0.62, z + 0.002], s.material('#dfe7ea', { metalness: 1, roughness: 0.05 }), 16)).rotation.x = Math.PI / 2;
      into(s.ball([0.012, 0.012, 0.012], [x, floorY + wall * 0.62 - 0.055, z + 0.005], s.material('#d9b23a', { metalness: 0.9, roughness: 0.2 }), 10));
    } else if (a.toys === 'millet') {
      const x = round ? R * 0.7 : W / 2 - 0.02;
      const seed = s.material('#c9a23f', { roughness: 0.9, flatShading: true });
      for (let i = 0; i < 6; i++) into(s.ball([0.016, 0.02, 0.016], [x - 0.012 + r(-0.008, 0.008), floorY + wall * 0.75 - i * 0.03, (round ? -R * 0.55 : 0) + r(-0.006, 0.006)], seed, 6));
    } else if (a.toys === 'ladder') {
      const plastic = s.material('#3f9ad6', { roughness: 0.4 });
      const x0 = round ? R * 0.2 : 0.05, z = round ? -R * 0.6 : -D / 2 + 0.04;
      for (const dx of [0, 0.04]) into(s.rod([x0 + dx, floorY, z + 0.06], [x0 + dx + 0.06, floorY + 0.2, z], 0.004, plastic));
      for (let i = 1; i < 6; i++) into(s.rod([x0 + i * 0.01, floorY + i * 0.033, z + 0.06 - i * 0.01], [x0 + 0.04 + i * 0.01, floorY + i * 0.033, z + 0.06 - i * 0.01], 0.003, plastic));
      into(s.ball([0.02, 0.02, 0.02], [-span * 0.4, floorY + 0.022, 0.07], s.material('#e2573d', { roughness: 0.4 }), 12));
    }

    // Husks on the cage floor, and thrown out below.
    const husk = new THREE.SphereGeometry(1, 5, 3);
    husk.scale(1, 0.35, 0.55);
    const chaff = s.material('#d9c58a', { roughness: 1 });
    const inner = Array.from({ length: Math.round(a.husks * 70) }, () => {
      const angle = r(0, 6.28), reach = Math.sqrt(random()) * (round ? R - 0.02 : 1);
      return { at: (round ? [Math.cos(angle) * reach, floorY + 0.005, Math.sin(angle) * reach] : [r(-W / 2 + 0.02, W / 2 - 0.02), floorY + 0.005, r(-D / 2 + 0.02, D / 2 - 0.02)]) as P, size: r(0.003, 0.006) };
    });
    if (inner.length) into(s.scatter(husk, chaff, inner));

    // The stand, and where the cage ends up on it.
    const K = 1.45;
    cage.scale.setScalar(K);
    let lift = 0, cageX = 0;
    if (a.stand === 'hanging') {
      lift = 1.72 - (peak + 0.06) * K;
      cageX = 0.42;
      s.lathe([[0.0, 0], [0.26, 0], [0.25, 0.03], [0.1, 0.055], [0.03, 0.09], [0.018, 0.14]], wire);
      s.cylinder(0.014, 0.018, 1.62, [0, 0.9, 0], wire, 10);
      s.tube([[0, 1.7, 0], [0.03, 1.86, 0], [0.2, 1.97, 0], [0.38, 1.93, 0], [0.42, 1.82, 0], [0.42, 1.745, 0]], 0.011, wire);
      s.ball([0.022, 0.022, 0.022], [0, 1.71, 0], wire, 10);
      s.rod([0.42, 1.75, 0], [0.42, 1.69, 0], 0.003, wire);
    } else if (a.stand === 'pedestal') {
      lift = 0.86;
      s.lathe([[0.0, 0], [0.24, 0], [0.23, 0.03], [0.07, 0.06], [0.025, 0.12]], wire);
      s.cylinder(0.016, 0.02, 0.76, [0, 0.47, 0], wire, 10);
      s.cylinder(round ? R * 1.1 : 0.24, 0.03, 0.03, [0, 0.845, 0], wire, 20);
    } else {
      lift = 0.66;
      const timber = s.material('#6b4a33', { roughness: 0.5 });
      s.cylinder(0.4, 0.4, 0.025, [0, 0.635, 0], timber, 28);
      for (let i = 0; i < 3; i++) { const t = (i / 3) * Math.PI * 2 + 0.5; s.rod([Math.cos(t) * 0.34, 0, Math.sin(t) * 0.34], [Math.cos(t) * 0.2, 0.63, Math.sin(t) * 0.2], 0.016, timber, 0.022); }
      s.cylinder(0.36, 0.36, 0.004, [0, 0.651, 0], s.material('#f4f1e8', { roughness: 1 }), 12);
      lift = 0.655;
    }
    cage.position.set(cageX, lift, 0);

    const ground = Array.from({ length: Math.round(Math.max(0, a.husks - 0.35) * 240) }, () => {
      const angle = r(0, 6.28), reach = Math.pow(random(), 0.6) * mix(0.35, 0.7, a.husks);
      return { at: [cageX + Math.cos(angle) * reach, a.stand === 'table' && reach < 0.38 ? 0.655 : 0.003, Math.sin(angle) * reach] as P, size: r(0.004, 0.008) };
    });
    if (ground.length) s.scatter(husk, chaff, ground);

    // Occupant.
    let hop: ((time: number) => void) | null = null;
    if (a.occupant === 'feather') {
      const tint = { green: '#7cc23f', blue: '#6fb7e6', yellow: '#f2d23a', grey: '#b9bcc0' }[a.bird];
      const feather = into(s.ball([0.008, 0.002, 0.03], [r(-0.06, 0.06), floorY + 0.008, r(0, 0.08)], s.material(tint), 8));
      feather.rotation.y = r(0, 3);
    }
    if (a.occupant === 'budgie') {
      const coat = { green: ['#6cbf3a', '#f2d83a', '#2c2d28'], blue: ['#5faee6', '#f4f4ef', '#3a3d45'], yellow: ['#f4d83c', '#f8e77a', '#e9cf5a'], grey: ['#aeb4ba', '#f1f1ee', '#6d7278'] }[a.bird];
      const body = s.material(coat[0], { roughness: 0.7 }), face = s.material(coat[1], { roughness: 0.7 }), wing = s.material(coat[2], { roughness: 0.8 });
      const bird = new THREE.Group();
      into(s.ball([0.026, 0.042, 0.03], [0, 0.045, 0], body, 14), bird).rotation.x = 0.35;
      into(s.ball([0.022, 0.022, 0.022], [0, 0.092, 0.014], face, 14), bird);
      into(s.mesh(new THREE.ConeGeometry(0.007, 0.014, 6), s.material('#d9a13a'), [0, 0.086, 0.036]), bird).rotation.x = 2.2;
      into(s.ball([0.006, 0.004, 0.004], [0, 0.094, 0.034], s.material(a.bird === 'grey' ? '#c58a9a' : '#3f6fd0'), 6), bird);
      for (const side of [-1, 1]) {
        into(s.ball([0.008, 0.032, 0.022], [side * 0.022, 0.048, -0.008], wing, 10), bird).rotation.x = 0.5;
        into(s.ball([0.0035, 0.0035, 0.0035], [side * 0.016, 0.098, 0.027], s.material('#111'), 6), bird);
        into(s.rod([side * 0.009, 0.012, 0.004], [side * 0.009, 0, 0.004], 0.0025, s.material('#c9a0a0')), bird);
      }
      into(s.rod([0, 0.02, -0.015], [0, -0.035, -0.07], 0.008, wing, 0.003), bird);
      bird.scale.setScalar(1.25);
      cage.add(bird);
      const spots: P[] = [[-span * 0.45, perchY + 0.006, 0.02], [span * 0.4, perchY + 0.006, 0.02], [0, swingY + 0.006, -0.03], [0.05, floorY + 0.006, 0.07]];
      const first = Math.floor(random() * 3);
      bird.position.set(...spots[first]);
      bird.rotation.y = r(-0.8, 0.8);
      const tempo = mix(0.25, 1.5, mood.energy);
      hop = (time) => {
        const beat = time * tempo, step = Math.floor(beat), phase = beat - step;
        const from = spots[(first + step) % spots.length], to = spots[(first + step + 1) % spots.length];
        // Sit for most of the beat, then spring across in the last fifth.
        const t = Math.max(0, (phase - 0.8) / 0.2);
        bird.position.set(mix(from[0], to[0], t), mix(from[1], to[1], t) + Math.sin(t * Math.PI) * 0.05 + Math.abs(Math.sin(beat * 9)) * 0.004 * (t === 0 ? 1 : 0), mix(from[2], to[2], t));
        bird.rotation.y = (to[0] - from[0] >= 0 ? 0.9 : -0.9) * (t > 0 ? 1 : Math.sin(step * 2.3));
        swing.rotation.x = Math.sin(time * 3) * 0.12 * ((first + step) % spots.length === 2 || (first + step + 1) % spots.length === 2 ? 1 : 0.25);
      };
    }
    if (a.occupant === 'covered') {
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = 128;
      const g = canvas.getContext('2d')!;
      if (a.cloth === 'teatowel') {
        g.fillStyle = '#f1ede2'; g.fillRect(0, 0, 128, 128);
        g.fillStyle = 'rgba(196,40,40,0.6)';
        for (let i = 0; i < 128; i += 32) { g.fillRect(i, 0, 14, 128); g.fillRect(0, i, 128, 14); }
      } else if (a.cloth === 'velvet') {
        g.fillStyle = '#23483a'; g.fillRect(0, 0, 128, 128);
        for (let i = 0; i < 30; i++) { g.fillStyle = 'rgba(255,255,255,0.05)'; g.fillRect(random() * 128, 0, 5, 128); }
      } else if (a.cloth === 'floral') {
        g.fillStyle = '#e9dccb'; g.fillRect(0, 0, 128, 128);
        for (let i = 0; i < 26; i++) {
          const x = random() * 128, y = random() * 128;
          g.fillStyle = ['#d98a9a', '#c9a0c9', '#e3b56a'][i % 3];
          for (let p = 0; p < 5; p++) { g.beginPath(); g.arc(x + Math.cos(p * 1.26) * 6, y + Math.sin(p * 1.26) * 6, 5, 0, 7); g.fill(); }
          g.fillStyle = '#8fae7a'; g.fillRect(x - 12, y + 9, 10, 4);
        }
      } else {
        const wool = ['#e2573d', '#f2d23a', '#3f9ad6', '#5fae5a', '#b05fc0', '#f4f1e6'];
        for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) {
          g.fillStyle = '#2d2d33'; g.fillRect(x * 32, y * 32, 32, 32);
          g.fillStyle = wool[Math.floor(random() * 6)]; g.fillRect(x * 32 + 3, y * 32 + 3, 26, 26);
          g.fillStyle = wool[Math.floor(random() * 6)]; g.fillRect(x * 32 + 10, y * 32 + 10, 12, 12);
        }
      }
      const map = new THREE.CanvasTexture(canvas);
      map.colorSpace = THREE.SRGBColorSpace; map.wrapS = map.wrapT = THREE.RepeatWrapping; map.repeat.set(4, 2);
      const cover = new THREE.MeshStandardMaterial({ map, roughness: 1, side: THREE.DoubleSide });
      const reach = (round ? R : Math.hypot(W, D) / 2 * 0.86) + 0.016;
      const hem = floorY + wall * r(0.12, 0.3);
      const profile: [number, number][] = [[reach * 1.1, hem], [reach * 1.04, hem + 0.05], [reach, eave - 0.02]];
      for (let i = 0; i <= 7; i++) { const t = (i / 7) * Math.PI / 2; profile.push([Math.max(0.012, Math.cos(t) * reach), eave + Math.sin(t) * (roof + 0.012)]); }
      if (round) {
        const shroud = into(s.mesh(new THREE.LatheGeometry(profile.map(([x, y]) => new THREE.Vector2(x, y)), 20), cover));
        const p = shroud.geometry.attributes.position;
        for (let i = 0; i < p.count; i++) if (p.getY(i) < hem + 0.06) { const k = 1 + Math.sin(Math.atan2(p.getZ(i), p.getX(i)) * 7) * 0.05; p.setX(i, p.getX(i) * k); p.setZ(i, p.getZ(i) * k); }
        shroud.geometry.computeVertexNormals();
      } else {
        // A cloth over a house cage: four hanging sides and a ridge tent.
        into(s.box([W + 0.03, eave - hem, D + 0.03], [0, (eave + hem) / 2, 0], cover));
        const prism = new THREE.Shape([new THREE.Vector2(-D / 2 - 0.015, 0), new THREE.Vector2(D / 2 + 0.015, 0), new THREE.Vector2(0, roof + 0.012)]);
        const tent = into(s.mesh(new THREE.ExtrudeGeometry(prism, { depth: W + 0.03, bevelEnabled: false }), cover, [-(W + 0.03) / 2, eave, 0]));
        tent.rotation.y = Math.PI / 2;
      }
    }

    const still = a.occupant !== 'budgie';
    const sway = a.stand === 'hanging' ? mix(0.002, 0.02, mood.energy) : 0;
    return s.finish({
      footprint: 0.4,
      update: (_dt, time) => {
        if (hop) hop(time);
        else if (still) swing.rotation.x = Math.sin(time * 1.3) * mix(0.01, 0.1, mood.energy);
        if (sway) cage.rotation.z = Math.sin(time * 0.9) * sway;
      },
    });
  },
});
