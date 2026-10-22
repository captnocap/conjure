import * as THREE from 'three';
import { Sculpture, choice, clamp01, defineWorld, diorama, mix, score } from '@conjure/kit';
import { encrust, painted, stained } from './sea';

type P3 = [number, number, number];
type P2 = [number, number];

const WATER = {
  green: { back: '#a9d3bd', sky: '#e4fff0', deep: '#3f7a66', sun: '#f6ffe6', sand: '#b9c2a0' },
  blue: { back: '#a8d4e8', sky: '#e6f6ff', deep: '#3a6f8f', sun: '#ffffff', sand: '#d6d2b4' },
  murk: { back: '#b6b999', sky: '#eef0d0', deep: '#6a6a48', sun: '#fff2c8', sand: '#a59a78' },
  dusk: { back: '#86aeb0', sky: '#c8e6e6', deep: '#2f5560', sun: '#d8f0ee', sand: '#8fa39a' },
} as const;

export default defineWorld({
  questions: {
    water: choice('What is the water like?', {
      green: 'Clear temperate green, sunlit: the classic wreck dive.',
      blue: 'Warm tropical blue, bright and glassy.',
      murk: 'Silty yellow-brown murk, an estuary or a harbour mouth.',
      dusk: 'Dim deep teal, late in the day or far down.',
    }),
    list: score('How steeply does the deck lie tilted?', ['Almost level, settled upright', 'A clear list to one side', 'Steeply canted, things ought to slide']),
    deck: choice('What is the deck made of?', {
      steel: 'Bare steel plating, rusted brown and seamed with rivets.',
      planked: 'Timber planking over steel, grey and lifting.',
      oxide: 'Red oxide deck paint, still showing between the rust.',
    }),
    hatch: choice('What is in the open cargo hatch?', {
      void: 'Blackness: the hold is empty and deep, with a ladder going down.',
      cargo: 'The cargo, still there: crates and barrels jumbled to the coaming.',
      boards: 'Hatch boards still half in place, the rest fallen in.',
      silt: 'Silt: the hold has filled to the brim with sand.',
    }),
    fixture: choice('What stands on the bow?', {
      windlass: 'The anchor windlass, its chains still running to the hawse pipes.',
      gun: 'A deck gun on a round platform: she was armed, this was a war loss.',
      winch: 'A steam cargo winch with its drums and a fallen derrick boom.',
    }),
    growth: choice('What has taken over the wreck?', {
      rust: 'Little yet: raw rust and a film of silt, a recent wreck.',
      furred: 'Barnacles and short weed furring every edge.',
      kelp: 'Tall kelp streaming up from the rails and the seabed.',
      coral: 'Sponges, fans and coral in colour: she has become a reef.',
    }),
    life: choice('What is moving in the water?', {
      nothing: 'Nothing at all.',
      school: 'A school of small silver fish wheeling over the deck.',
      jellyfish: 'A few pale jellyfish drifting.',
      ray: 'One big ray gliding slowly round.',
    }),
  },

  build(a, context) {
    const { mood, random } = context;
    const water = WATER[a.water];
    const { art, world } = diorama(context, {
      background: water.back, floor: null, width: 14, depth: 10, maxHeight: 3.0, radius: 1.4, pitch: 31, yaw: 30,
      slots: [[0.2, 1.7], [3.7, 2.5, 0, 0.9], [-2.4, 2.3, 0, 0.9], [-1.7, -2.4, 0, 0.9], [5.9, 0.4, 0, 0.8]],
    });
    // Underwater light: a soft green dome and a pale sun from straight above.
    for (const child of art.root.children) {
      const dome = child as THREE.HemisphereLight;
      if (dome.isHemisphereLight) { dome.color.set(water.sky); dome.groundColor.set(water.deep); dome.intensity = a.water === 'dusk' ? 1.2 : 1.5; }
    }
    world.keyLight?.color.set(water.sun).lerp(new THREE.Color('#ffd9a0'), mood.warmth * 0.25);
    if (world.keyLight) world.keyLight.intensity = a.water === 'dusk' ? 1.9 : a.water === 'murk' ? 2.2 : 2.7;

    const ship = new Sculpture(context);
    art.root.add(ship.root);
    const tilt = mix(0.04, 0.27, a.list);
    ship.root.rotation.set(tilt * 0.45, 0, -tilt);
    const wear = mood.wear;
    const grown = { rust: 0, furred: 0.6, kelp: 0.8, coral: 1 }[a.growth];
    const hull = stained(random, '#3a3536', '#8a4a26', clamp01(0.45 + wear * 0.4), { metalness: 0.2, roughness: 0.9, side: THREE.DoubleSide });
    hull.map!.repeat.set(1, 1);
    const iron = stained(random, '#4a4744', a.growth === 'rust' ? '#8a4a26' : '#5d7350', clamp01(0.4 + wear * 0.4), { metalness: 0.25, roughness: 0.9 });
    const rustIron = stained(random, '#5a4a3e', '#8a4a26', clamp01(0.5 + wear * 0.4), { metalness: 0.2, roughness: 0.9 });
    const black = ship.material('#0a0f10', { roughness: 1 });
    const wood = ship.material('#6f6048', { roughness: 0.95 });
    const hosts: THREE.Mesh[] = [];

    // Deck outline: straight sides running aft out of frame, drawn in to a bow.
    const bowCurve = new THREE.CatmullRomCurve3([[-1.5, -4.6], [-4.4, -3.7], [-6.5, -1.9], [-7.5, 0], [-6.5, 1.9], [-4.4, 3.7], [-1.5, 4.6]].map(([x, z]) => new THREE.Vector3(x, 0, z)));
    const bow: P2[] = bowCurve.getPoints(28).map((p) => [p.x, p.z]);
    const outline: P2[] = [[7, -4.6], ...bow, [7, 4.6]];
    const hatch = { x0: 0.9, x1: 5.1, z0: -3.7, z1: -1.0 };

    const tones = { steel: '#6a6259', planked: '#8d8268', oxide: '#8a4d3c' }[a.deck];
    const deckMap = painted(1024, 1024, (g, w, h) => {
      const px = (x: number) => ((x + 8) / 16) * w, pz = (z: number) => ((z + 8) / 16) * h;
      g.fillStyle = tones;
      g.fillRect(0, 0, w, h);
      if (a.deck === 'planked') {
        for (let z = -5; z < 5; z += 0.22) {
          g.fillStyle = `rgba(${random() < 0.5 ? '40,34,24' : '200,190,160'},${0.08 + random() * 0.14})`;
          g.fillRect(0, pz(z), w, pz(z + 0.22) - pz(z) - 1.5);
          g.fillStyle = 'rgba(30,26,20,0.55)';
          g.fillRect(0, pz(z + 0.22) - 1.5, w, 1.5);
          for (let x = -8 + random() * 3; x < 8; x += 2.5 + random() * 2) g.fillRect(px(x), pz(z), 1.5, pz(z + 0.22) - pz(z));
        }
      } else {
        g.strokeStyle = 'rgba(30,24,20,0.6)';
        g.lineWidth = 2;
        for (let x = -8; x < 8; x += 2.4) { g.beginPath(); g.moveTo(px(x), 0); g.lineTo(px(x), h); g.stroke(); }
        for (let z = -5; z < 5.2; z += 1.55) { g.beginPath(); g.moveTo(0, pz(z)); g.lineTo(w, pz(z)); g.stroke(); }
        g.fillStyle = 'rgba(30,24,20,0.5)';
        for (let x = -8; x < 8; x += 2.4) for (let z = -5; z < 5; z += 0.16) g.fillRect(px(x) + 4, pz(z), 2, 2);
        for (let z = -5; z < 5.2; z += 1.55) for (let x = -8; x < 8; x += 0.16) g.fillRect(px(x), pz(z) + 4, 2, 2);
      }
      const blot = (colour: string, count: number, size: number, alpha: number) => {
        for (let i = 0; i < count; i++) {
          const x = random() * w, y = pz(-5) + random() * (pz(5) - pz(-5)), r = (6 + random() * random() * size);
          const gradient = g.createRadialGradient(x, y, 0, x, y, r);
          gradient.addColorStop(0, colour); gradient.addColorStop(0.5, colour); gradient.addColorStop(1, 'rgba(0,0,0,0)');
          g.globalAlpha = alpha * (0.5 + random() * 0.5); g.fillStyle = gradient;
          g.beginPath(); g.ellipse(x, y, r * (1 + random()), r, random() * 3, 0, 7); g.fill();
        }
        g.globalAlpha = 1;
      };
      blot('#8a4a26', 60 + wear * 200, 46, 0.6);
      blot('#3b2a20', 40 + wear * 60, 30, 0.45);
      if (grown > 0) blot(a.growth === 'coral' ? '#7f9a6a' : '#55693f', grown * 260, 50, 0.55);
      if (a.growth === 'coral') { blot('#c9705a', 50, 22, 0.6); blot('#d9b06a', 40, 18, 0.55); blot('#a878a8', 30, 18, 0.5); }
      // Silt drifts to the low side and against the hatch coaming.
      const drift = g.createLinearGradient(px(-6), pz(-5), px(8), pz(6));
      drift.addColorStop(0.45, 'rgba(0,0,0,0)'); drift.addColorStop(1, water.sand);
      g.globalAlpha = mix(0.35, 0.8, a.list); g.fillStyle = drift; g.fillRect(0, 0, w, h); g.globalAlpha = 1;
      blot(water.sand, 50, 60, 0.5);
      g.strokeStyle = 'rgba(20,16,12,0.5)'; g.lineWidth = 14;
      g.strokeRect(px(hatch.x0) - 10, pz(hatch.z0) - 10, px(hatch.x1) - px(hatch.x0) + 20, pz(hatch.z1) - pz(hatch.z0) + 20);
    });
    deckMap.repeat.set(1 / 16, 1 / 16);
    deckMap.offset.set(0.5, 0.5);
    const deckShape = new THREE.Shape(outline.map(([x, z]) => new THREE.Vector2(x, -z)));
    const hole = new THREE.Path([[hatch.x0, -hatch.z0], [hatch.x1, -hatch.z0], [hatch.x1, -hatch.z1], [hatch.x0, -hatch.z1]].map(([x, y]) => new THREE.Vector2(x, y)));
    deckShape.holes.push(hole);
    const deckGeometry = new THREE.ShapeGeometry(deckShape, 8);
    deckGeometry.rotateX(-Math.PI / 2);
    const deck = ship.mesh(deckGeometry, new THREE.MeshStandardMaterial({ map: deckMap, roughness: 0.95, metalness: 0.05 }));
    deck.castShadow = false;
    world.ground = deck;

    // A wall following a path in plan, from y0 up to y1.
    const strip = (path: readonly P2[], y0: number | ((x: number, z: number) => number), y1: number, material: THREE.Material) => {
      const positions: number[] = [], uvs: number[] = [], index: number[] = [];
      let run = 0;
      path.forEach(([x, z], i) => {
        if (i) run += Math.hypot(x - path[i - 1][0], z - path[i - 1][1]);
        const low = typeof y0 === 'number' ? y0 : y0(x, z);
        positions.push(x, low, z, x, y1, z);
        uvs.push(run / 3, 0, run / 3, (y1 - low) / 3);
        if (i) index.push(i * 2 - 2, i * 2, i * 2 - 1, i * 2 - 1, i * 2, i * 2 + 1);
      });
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
      geometry.setIndex(index);
      geometry.computeVertexNormals();
      return ship.mesh(geometry, material);
    };
    // The hull runs down exactly as far as the level seabed, however she lies.
    ship.root.updateMatrix();
    const e = ship.root.matrix.elements;
    const bed = -1.45 - tilt * 2.5;
    strip([...outline, [7, -4.6]], (x, z) => Math.min(-0.15, (bed - 0.3 - e[1] * x - e[9] * z) / e[5]), 0, hull);
    // Boot-topping band and rubbing strake.
    ship.tube(outline.map(([x, z]) => [x * 1.004, -0.05, z * 1.006] as P3), 0.06, iron);
    // Bow bulwark with a capping rail; open rails along the sides.
    const bulwarkTop = 0.95;
    hosts.push(strip(bow, 0, bulwarkTop, hull));
    hosts.push(ship.tube(bow.map(([x, z]) => [x, bulwarkTop, z] as P3), 0.05, iron));
    const stays: { at: P3; size: number }[] = [];
    for (let i = 2; i < bow.length - 1; i += 3) stays.push({ at: [bow[i][0] * 0.975, 0.45, bow[i][1] * 0.975], size: 1 });
    ship.scatter(new THREE.BoxGeometry(0.06, 0.9, 0.16), iron, stays);
    const posts: { at: P3; size: number }[] = [];
    for (const z of [-4.5, 4.5]) {
      let previous: number | null = null;
      for (let x = -1.2; x <= 6.9; x += 1.35) {
        const standing = random() > wear * 0.3;
        if (standing) posts.push({ at: [x, 0.5, z], size: 1 });
        if (previous !== null && standing) {
          for (const y of [0.5, 0.98]) {
            if (random() < wear * 0.45) {
              if (random() < 0.6) ship.rod([previous, y, z], [x - 0.3 - random() * 0.5, y - 0.5 - random() * 0.4, z + (random() - 0.5) * 0.5], 0.022, iron);
            } else hosts.push(ship.rod([previous, y, z], [x, y, z], 0.022, iron));
          }
        }
        previous = standing ? x : null;
      }
    }
    ship.scatter(new THREE.CylinderGeometry(0.03, 0.035, 1, 8), iron, posts);

    // Cargo hatch: a raised coaming round a real hole into the hold.
    const cw = 0.12, ch = 0.5;
    const hx = (hatch.x0 + hatch.x1) / 2, hz = (hatch.z0 + hatch.z1) / 2, hw = hatch.x1 - hatch.x0, hd = hatch.z1 - hatch.z0;
    for (const z of [hatch.z0 - cw / 2, hatch.z1 + cw / 2]) hosts.push(ship.box([hw + cw * 2, ch, cw], [hx, ch / 2, z], rustIron));
    for (const x of [hatch.x0 - cw / 2, hatch.x1 + cw / 2]) hosts.push(ship.box([cw, ch, hd], [x, ch / 2, hz], rustIron));
    for (let i = 0; i < 5; i++) ship.box([0.07, ch * 0.9, 0.22], [hatch.x0 + 0.4 + i * (hw - 0.8) / 4, ch * 0.45, hatch.z1 + cw + 0.1], rustIron).rotation.x = -0.35;
    const holdDepth = 2.6;
    ship.box([hw, 0.05, hd], [hx, -holdDepth, hz], black);
    for (const z of [hatch.z0 - 0.02, hatch.z1 + 0.02]) ship.box([hw, holdDepth, 0.03], [hx, -holdDepth / 2, z], black);
    for (const x of [hatch.x0 - 0.02, hatch.x1 + 0.02]) ship.box([0.03, holdDepth, hd], [x, -holdDepth / 2, hz], black);
    if (a.hatch === 'void') {
      for (const z of [-0.2, 0.2]) ship.rod([hatch.x0 + 0.12, -holdDepth, hz + z], [hatch.x0 + 0.12, ch + 0.5, hz + z], 0.03, iron);
      for (let y = -2.2; y < ch + 0.4; y += 0.3) ship.rod([hatch.x0 + 0.12, y, hz - 0.2], [hatch.x0 + 0.12, y, hz + 0.2], 0.02, iron);
    } else if (a.hatch === 'cargo') {
      const crateWood = ship.material('#8a6f48', { roughness: 0.95 }), barrel = ship.material('#5f4a34', { roughness: 0.9 });
      const count = Math.round(mix(9, 20, mood.density));
      for (let i = 0; i < count; i++) {
        const x = mix(hatch.x0 + 0.5, hatch.x1 - 0.5, random()), z = mix(hatch.z0 + 0.5, hatch.z1 - 0.5, random()), y = mix(-0.75, 0.15, random());
        if (i % 3 === 0) {
          const cask = ship.lathe([[0.26, -0.4], [0.33, -0.15], [0.33, 0.15], [0.26, 0.4]], barrel, [x, y, z]);
          cask.rotation.set(random() * 3, random() * 3, random() < 0.5 ? Math.PI / 2 : 0.3);
          for (const band of [-0.25, 0.25]) { const hoop = new THREE.Mesh(new THREE.TorusGeometry(0.31, 0.02, 6, 20), rustIron); hoop.rotation.x = Math.PI / 2; hoop.position.y = band; cask.add(hoop); }
        } else {
          const size = mix(0.6, 1.1, random());
          const crate = ship.box([size, size * mix(0.6, 0.9, random()), size * mix(0.7, 1, random())], [x, y, z], crateWood);
          crate.rotation.set((random() - 0.5) * 0.7, random() * 3, (random() - 0.5) * 0.7);
          hosts.push(crate);
        }
      }
      ship.box([hw, 0.3, hd], [hx, -1.0, hz], ship.material('#2a2620', { roughness: 1 }));
    } else if (a.hatch === 'boards') {
      const n = 9;
      for (let i = 0; i < n; i++) {
        const x = hatch.x0 + (i + 0.5) * (hw / n);
        const fallen = random() < mix(0.25, 0.6, wear) || i === 3;
        const board = ship.box([hw / n - 0.04, 0.07, hd + 0.1], [x, ch + 0.035, hz], wood);
        if (fallen) { board.position.set(x + (random() - 0.5) * 0.3, -mix(0.3, 1.1, random()), hz + (random() - 0.5) * 0.8); board.rotation.set((random() - 0.5) * 1.1, (random() - 0.5) * 0.5, (random() - 0.5) * 0.9); }
        else board.rotation.y = (random() - 0.5) * 0.04;
      }
      // A rag of tarpaulin hanging over the corner.
      const tarp = ship.box([1.5, 0.02, 1.1], [hatch.x1 - 0.5, ch + 0.09, hatch.z1 - 0.3], ship.material('#4a5a50', { roughness: 1 }));
      tarp.rotation.set(0.05, 0.3, -0.04);
      ship.box([1.2, 0.02, 0.7], [hatch.x1 - 0.5, ch * 0.45, hatch.z1 + cw + 0.14], ship.material('#4a5a50', { roughness: 1 })).rotation.set(1.25, 0.3, 0);
    } else {
      const sand = ship.material(water.sand, { roughness: 1 });
      ship.box([hw, 0.4, hd], [hx, -0.05, hz], sand);
      for (let i = 0; i < 4; i++) ship.ball([mix(0.6, 1.3, random()), mix(0.12, 0.3, random()), mix(0.5, 1, random())], [mix(hatch.x0 + 0.8, hatch.x1 - 0.8, random()), 0.15, mix(hatch.z0 + 0.6, hatch.z1 - 0.6, random())], sand, 14);
    }

    // Kingpost aft of the hatch, snapped off, with a ventilator cowl each side.
    const postX = 6.15, postZ = -2.3;
    hosts.push(ship.cylinder(0.24, 0.3, 3.3, [postX, 1.65, postZ], iron, 14));
    ship.cylinder(0.42, 0.46, 0.25, [postX, 0.125, postZ], iron, 14);
    ship.cylinder(0.3, 0.3, 0.12, [postX, 2.5, postZ], iron, 14);
    ship.mesh(new THREE.CylinderGeometry(0.1, 0.24, 0.5, 7), rustIron, [postX + 0.05, 3.5, postZ]).rotation.z = 0.3;
    const cowl = (x: number, z: number, turn: number, height: number) => {
      const c = new Sculpture(context);
      hosts.push(c.cylinder(0.24, 0.27, height, [0, height / 2, 0], iron, 14));
      c.cylinder(0.33, 0.33, 0.1, [0, 0.05, 0], iron, 14);
      const neck = c.ring(0.3, 0.24, [0.3, height, 0], iron, Math.PI / 2);
      neck.rotation.set(0, 0, Math.PI / 2);
      const mouth = c.lathe([[0.24, 0], [0.3, 0.12], [0.44, 0.26], [0.47, 0.28]], iron, [0.3, height + 0.3, 0]);
      mouth.rotation.z = -Math.PI / 2;
      (mouth.material as THREE.MeshStandardMaterial).side = THREE.DoubleSide;
      const dark = c.mesh(new THREE.CircleGeometry(0.3, 16), black, [0.42, height + 0.3, 0]);
      dark.rotation.y = Math.PI / 2;
      c.root.position.set(x, 0, z);
      c.root.rotation.y = turn;
      ship.root.add(c.root);
    };
    cowl(-0.3, -3.6, mix(-0.9, -0.3, random()), 1.5);
    cowl(6.3, 3.4, mix(-2.2, -1.2, random()), 1.25);

    // Bollards.
    for (const [x, z] of [[-2.9, 3.55], [2.2, 4.0], [-2.9, -3.55]] as P2[]) {
      ship.box([1.1, 0.08, 0.42], [x, 0.04, z], iron);
      for (const o of [-0.3, 0.3]) { hosts.push(ship.cylinder(0.13, 0.15, 0.5, [x + o, 0.3, z], iron, 12)); ship.cylinder(0.18, 0.18, 0.07, [x + o, 0.57, z], iron, 12); }
    }

    // The bow fixture.
    const chainIron = rustIron;
    const chain = (points: P3[]) => {
      const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)));
      const count = Math.max(2, Math.round(curve.getLength() / 0.21));
      const link = new THREE.TorusGeometry(0.09, 0.03, 6, 10);
      link.scale(1.5, 1, 1);
      const mesh = new THREE.InstancedMesh(link, chainIron, count);
      const m = new THREE.Matrix4(), q = new THREE.Quaternion(), roll = new THREE.Quaternion(), xAxis = new THREE.Vector3(1, 0, 0), one = new THREE.Vector3(1, 1, 1);
      for (let i = 0; i < count; i++) {
        const u = i / (count - 1);
        q.setFromUnitVectors(xAxis, curve.getTangentAt(u).normalize());
        roll.setFromAxisAngle(xAxis, (i % 2 ? 1 : -1) * Math.PI / 4);
        m.compose(curve.getPointAt(u), q.multiply(roll), one);
        mesh.setMatrixAt(i, m);
      }
      mesh.castShadow = mesh.receiveShadow = true;
      ship.root.add(mesh);
    };
    const fx = -4.3;
    if (a.fixture === 'windlass') {
      ship.box([1.5, 0.2, 2.9], [fx, 0.1, 0], iron);
      for (const z of [-1, 1]) {
        hosts.push(ship.cylinder(0.42, 0.42, 0.5, [fx, 0.75, z * 0.75], iron, 16));
        (ship.root.children[ship.root.children.length - 1] as THREE.Mesh).rotation.x = Math.PI / 2;
        for (const o of [-0.28, 0.28]) ship.cylinder(0.52, 0.52, 0.06, [fx, 0.75, z * 0.75 + o], iron, 18).rotation.x = Math.PI / 2;
        ship.box([0.3, 0.95, 0.14], [fx, 0.5, z * 1.2], iron);
        const end = ship.lathe([[0.2, 0], [0.13, 0.12], [0.13, 0.3], [0.22, 0.42]], iron, [fx, 0.75, z * 1.28]);
        end.rotation.x = z * Math.PI / 2;
        chain([[fx - 0.1, 1.15, z * 0.75], [fx - 0.9, 0.7, z * 0.78], [fx - 1.5, 0.12, z * 0.82], [-6.25, 0.1, z * 0.95]]);
        ship.cylinder(0.26, 0.3, 0.2, [-6.3, 0.1, z * 0.95], iron, 12);
        chain([[fx + 0.3, 1.0, z * 0.75], [fx + 0.8, 0.3, z * 0.7], [fx + 1.3, 0.08, z * 0.62]]);
        ship.cylinder(0.2, 0.24, 0.18, [fx + 1.35, 0.09, z * 0.62], iron, 10);
      }
      ship.box([0.9, 0.9, 0.5], [fx + 0.1, 0.55, 0], iron);
      ship.cylinder(0.36, 0.36, 0.1, [fx + 0.1, 0.8, 0.3], rustIron, 16).rotation.x = Math.PI / 2;
      ship.rod([fx, 0.75, -1.4], [fx, 0.75, 1.4], 0.08, iron);
      const lever = ship.rod([fx + 0.5, 0.6, -0.4], [fx + 1.0, 1.45, -0.45], 0.03, iron);
      hosts.push(lever);
    } else if (a.fixture === 'gun') {
      hosts.push(ship.cylinder(1.5, 1.6, 0.3, [fx, 0.15, 0], iron, 24));
      ship.cylinder(0.4, 0.5, 0.8, [fx, 0.7, 0], iron, 14);
      const gun = new Sculpture(context);
      gun.box([0.7, 0.55, 0.7], [0, 0, 0], iron);
      hosts.push(gun.rod([-0.2, 0.05, 0], [-2.6, 0.05, 0], 0.12, iron, 0.085));
      gun.cylinder(0.11, 0.11, 0.12, [-2.6, 0.05, 0], rustIron, 10).rotation.z = Math.PI / 2;
      gun.box([0.12, 1.1, 1.5], [-0.42, 0.15, 0], iron);
      gun.rod([0.3, -0.1, 0.3], [0.7, 0.1, 0.45], 0.03, iron);
      gun.ring(0.16, 0.025, [0.72, 0.1, 0.45], iron);
      gun.root.position.set(fx, 1.3, 0);
      gun.root.rotation.set(0, mix(-0.9, 0.9, random()), -mix(0.02, 0.4, random()));
      ship.root.add(gun.root);
      for (let i = 0; i < 4; i++) ship.cylinder(0.06, 0.06, 0.4, [fx + 1.9 + random() * 0.4, 0.07, -0.8 + i * 0.25 + random() * 0.2], ship.material('#9a8a4a', { metalness: 0.5, roughness: 0.5 }), 8).rotation.set(Math.PI / 2, 0, random() * 0.6);
    } else {
      ship.box([1.9, 0.2, 2.2], [fx, 0.1, 0], iron);
      for (const z of [-1, 1]) {
        ship.box([1.1, 1.0, 0.12], [fx, 0.6, z * 0.85], iron);
        const drum = ship.cylinder(0.3, 0.3, 0.5, [fx, 0.8, z * 0.45], rustIron, 14);
        drum.rotation.x = Math.PI / 2;
        hosts.push(drum);
        ship.cylinder(0.24, 0.24, 0.6, [fx + 0.55, 0.45, z * 0.5], iron, 12).rotation.z = Math.PI / 2;
      }
      for (const o of [-0.72, -0.2, 0.2, 0.72]) ship.cylinder(0.45, 0.45, 0.05, [fx, 0.8, o], iron, 16).rotation.x = Math.PI / 2;
      ship.cylinder(0.5, 0.5, 0.08, [fx - 0.2, 0.75, 1.0], rustIron, 18).rotation.x = Math.PI / 2;
      // The derrick boom lies where it fell, across the deck toward the hatch.
      const boom = ship.rod([fx + 0.9, 0.5, 0.3], [hatch.x0 + 0.6, ch + 0.12, hatch.z1 - 0.4], 0.14, iron, 0.09);
      hosts.push(boom);
      ship.rod([fx + 0.3, 0.8, 0.45], [fx + 2.2, 0.06, 1.4], 0.02, rustIron);
      ship.rod([fx + 2.2, 0.06, 1.4], [fx + 3.4, 0.05, 0.9], 0.02, rustIron);
    }

    // Seabed: level sand the hull has settled into, with scour, stones and plating debris.
    const sand = art.material(water.sand, { roughness: 1 });
    art.box([17.5, 0.5, 13.6], [0.3, bed - 0.25, 0.4], sand).castShadow = false;
    for (let i = 0; i < 12; i++) {
      const t = random() * 6.283, r = mix(0.6, 1, random());
      art.ball([mix(1.2, 3, random()), mix(0.2, 0.7, random()), mix(1, 2.4, random())], [Math.cos(t) * 7.6 * r, bed, Math.sin(t) * 5.9 * r], sand, 14).castShadow = false;
    }
    const stone = art.material('#6f7a6c', { roughness: 1 });
    for (let i = 0; i < 9; i++) {
      const x = mix(-8, 8.6, random()), z = random() < 0.6 ? mix(5.4, 6.8, random()) : mix(-6, 6.8, random());
      if (Math.abs(z) < 5.4 && x < 7.6) continue;
      const rock = art.mesh(new THREE.DodecahedronGeometry(mix(0.25, 0.7, random()), 0), stone, [x, bed + 0.1, z]);
      rock.rotation.set(random() * 3, random() * 3, random() * 3);
      rock.scale.y = 0.6;
    }
    const scrap = art.box([1.8, 0.04, 1.2], [mix(2, 6, random()), bed + 0.12, 6.0], rustIron);
    scrap.rotation.set(0.2, random() * 3, 0.12);

    // Growth.
    if (grown > 0) {
      encrust(ship, hosts, grown * mix(260, 620, wear) * mix(0.7, 1.2, mood.density), 0.07);
      const weedColours = ['#4a5a2a', '#5f6a30', '#3a4a2c', '#6a6a3a'];
      const blade = new THREE.ConeGeometry(0.07, 1, 4);
      blade.translate(0, 0.5, 0);
      blade.scale(1, 1, 0.3);
      const tufts: { at: P3; size: number; color: string }[] = [];
      const edge = () => {
        const pick = random();
        if (pick < 0.4) { const p = bow[Math.floor(random() * bow.length)]; return [p[0], bulwarkTop, p[1]] as P3; }
        if (pick < 0.7) return [mix(-1.2, 6.9, random()), random() < 0.5 ? 0.98 : 0.02, random() < 0.5 ? -4.5 : 4.5] as P3;
        if (pick < 0.85) return [mix(hatch.x0, hatch.x1, random()), ch, random() < 0.5 ? hatch.z0 - 0.06 : hatch.z1 + 0.06] as P3;
        return [mix(-6, 7, random()), 0, mix(-4.2, 4.2, random())] as P3;
      };
      for (let i = 0; i < grown * mix(120, 300, mood.density); i++) tufts.push({ at: edge(), size: mix(0.2, 0.65, random()), color: weedColours[Math.floor(random() * 4)] });
      const tuftMesh = ship.scatter(blade, new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.8 }), tufts);
      tuftMesh.castShadow = false;
    }
    const swayers: THREE.Object3D[] = [];
    if (a.growth === 'kelp') {
      const kelpMat = [art.material('#5a6a26', { roughness: 0.7, side: THREE.DoubleSide }), art.material('#6f7030', { roughness: 0.7, side: THREE.DoubleSide }), art.material('#465a2a', { roughness: 0.7, side: THREE.DoubleSide })];
      const stalks = Math.round(mix(9, 20, mood.density));
      for (let i = 0; i < stalks; i++) {
        const onShip = i % 3 !== 0;
        const p: P3 = onShip ? (i % 2 ? [bow[(i * 5) % bow.length][0], bulwarkTop, bow[(i * 5) % bow.length][1]] : [mix(-1, 6.8, random()), 0.95, -4.5]) : [mix(-8, 8.5, random()), bed, random() < 0.7 ? mix(5.3, 6.8, random()) : -mix(5.3, 6.2, random())];
        const tall = mix(1.6, onShip ? 3.4 : 4.6, random());
        const holder = new THREE.Group();
        const points: THREE.Vector3[] = [];
        const lean = (random() - 0.5) * 0.5, phase = random() * 6;
        for (let k = 0; k <= 6; k++) points.push(new THREE.Vector3(Math.sin(k * 0.9 + phase) * 0.14 + lean * (k / 6) ** 2 * tall * 0.4, (k / 6) * tall, Math.cos(k * 0.7 + phase) * 0.1));
        const frond = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 18, 0.11, 5), kelpMat[i % 3]);
        frond.scale.z = 0.25;
        frond.castShadow = true;
        holder.add(frond);
        holder.position.set(...p);
        holder.rotation.y = random() * 3;
        (onShip ? ship.root : art.root).add(holder);
        swayers.push(holder);
      }
    } else if (a.growth === 'coral') {
      const bloom = ['#d0563e', '#e08a3a', '#cf6a8a', '#e0b84a', '#8a78b0', '#e6dcc8'];
      encrust(ship, hosts, mix(40, 90, mood.density), 0.2, bloom, 'blob');
      const fans = Math.round(mix(5, 12, mood.density));
      for (let i = 0; i < fans; i++) {
        const p = bow[2 + Math.floor(random() * (bow.length - 4))];
        const onBow = i % 2 === 0;
        const fan = ship.mesh(new THREE.CircleGeometry(mix(0.35, 0.8, random()), 9, 0, Math.PI), new THREE.MeshStandardMaterial({ color: bloom[i % 5], roughness: 0.9, side: THREE.DoubleSide }), onBow ? [p[0], bulwarkTop, p[1]] : [mix(-1, 6.8, random()), 0.98, random() < 0.5 ? -4.5 : 4.5]);
        fan.rotation.y = random() * 3;
      }
    }

    // Shafts of sun from the surface: see-through, so they light the picture without being measured.
    const shafts: THREE.Mesh[] = [];
    const shaftCount = a.water === 'murk' ? 3 : a.water === 'dusk' ? 2 : 5;
    const slant = mix(-0.35, 0.35, mood.daylight);
    for (let i = 0; i < shaftCount; i++) {
      const width = mix(0.7, 1.9, random());
      const shaft = new THREE.Mesh(new THREE.CylinderGeometry(width * 0.55, width, 13, 10, 1, true), new THREE.MeshBasicMaterial({ color: water.sun, transparent: true, opacity: mix(0.05, 0.13, mood.cheer) * (a.water === 'dusk' ? 0.6 : 1), depthWrite: false, side: THREE.DoubleSide }));
      shaft.position.set(mix(-6, 6, random()), 4.5, mix(-4, 3, random()));
      shaft.rotation.set(mix(-0.08, 0.08, random()), 0, slant + mix(-0.06, 0.06, random()));
      art.root.add(shaft);
      shafts.push(shaft);
    }
    // Marine snow.
    const motes = new THREE.InstancedMesh(new THREE.SphereGeometry(0.025, 5, 4), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.55, depthWrite: false }), Math.round(mix(40, 120, mood.density)));
    const mm = new THREE.Matrix4();
    for (let i = 0; i < motes.count; i++) motes.setMatrixAt(i, mm.makeTranslation(mix(-8, 8, random()), mix(0.2, 6, random()), mix(-5.5, 5.5, random())));
    art.root.add(motes);

    // Life.
    let school: THREE.InstancedMesh | null = null, ray: THREE.Group | null = null;
    const jellies: THREE.Group[] = [];
    const fish = Array.from({ length: Math.round(mix(14, 40, mood.density)) }, () => ({ r: mix(2.2, 4.2, random()), y: mix(2.7, 3.6, random()), phase: random() * 6.283, bob: random() * 6 }));
    if (a.life === 'school') {
      const body = new THREE.ConeGeometry(0.13, 0.62, 5);
      body.rotateZ(-Math.PI / 2);
      body.scale(1, 1, 0.4);
      school = new THREE.InstancedMesh(body, new THREE.MeshStandardMaterial({ color: mood.cheer > 0.6 ? '#f2d04a' : '#d9e2e4', metalness: 0.6, roughness: 0.3 }), fish.length);
      school.castShadow = true;
      art.root.add(school);
    } else if (a.life === 'jellyfish') {
      for (let i = 0; i < Math.round(mix(3, 7, mood.density)); i++) {
        const jelly = new THREE.Group();
        const tint = mood.cheer > 0.5 ? '#f6c6e0' : '#e6f0f4';
        const bell = new THREE.Mesh(new THREE.SphereGeometry(0.3, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: tint, emissive: tint, emissiveIntensity: 0.35, transparent: true, opacity: 0.6, roughness: 0.3, side: THREE.DoubleSide, depthWrite: false }));
        jelly.add(bell);
        for (let k = 0; k < 6; k++) {
          const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.004, mix(0.5, 1.0, random()), 4), new THREE.MeshStandardMaterial({ color: tint, transparent: true, opacity: 0.55, depthWrite: false }));
          arm.position.set(Math.cos(k) * 0.16, -0.35, Math.sin(k) * 0.16);
          jelly.add(arm);
        }
        jelly.position.set(mix(-6, 6.5, random()), mix(1.8, 3.6, random()), mix(-4, 4, random()));
        jelly.scale.setScalar(mix(0.7, 1.5, random()));
        jelly.userData.phase = random() * 6;
        art.root.add(jelly);
        jellies.push(jelly);
      }
    } else if (a.life === 'ray') {
      ray = new THREE.Group();
      const skin = new THREE.MeshStandardMaterial({ color: '#4a5560', roughness: 0.6, side: THREE.DoubleSide });
      const wing = new THREE.Shape();
      wing.moveTo(0.9, 0); wing.quadraticCurveTo(0.2, 0.5, 0, 1.6); wing.quadraticCurveTo(-0.5, 0.5, -0.9, 0); wing.quadraticCurveTo(-0.5, -0.5, 0, -1.6); wing.quadraticCurveTo(0.2, -0.5, 0.9, 0);
      const flat = new THREE.Mesh(new THREE.ExtrudeGeometry(wing, { depth: 0.12, bevelEnabled: true, bevelSize: 0.08, bevelThickness: 0.06, bevelSegments: 2 }), skin);
      flat.rotation.x = Math.PI / 2;
      flat.castShadow = true;
      const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.005, 1.8, 5), skin);
      tail.rotation.z = Math.PI / 2;
      tail.position.set(-1.7, -0.06, 0);
      ray.add(flat, tail);
      art.root.add(ray);
    }

    // Things stand on the canted deck: hand the cast to the tilted ship before the stage is framed.
    const settle = world.place.bind(world);
    world.place = (items) => {
      for (const item of items) ship.root.add(item.holder);
      settle(items);
    };

    const energy = mood.energy;
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), at = new THREE.Vector3(), one = new THREE.Vector3(1, 1, 1), yAxis = new THREE.Vector3(0, 1, 0);
    const swim = (time: number) => {
      if (school) {
        const speed = mix(0.12, 0.7, energy);
        fish.forEach((f, i) => {
          const t = f.phase * 0.25 + time * speed * (3 / f.r) + (i % 5) * 0.11;
          at.set(1 + Math.cos(t) * f.r, f.y + Math.sin(time * 0.8 + f.bob) * 0.12, Math.sin(t) * f.r * 0.75);
          q.setFromAxisAngle(yAxis, -t - Math.PI / 2);
          school!.setMatrixAt(i, m.compose(at, q, one));
        });
        school.instanceMatrix.needsUpdate = true;
      }
      if (ray) {
        const t = time * mix(0.06, 0.3, energy) + 0.8;
        ray.position.set(0.5 + Math.cos(t) * 4.6, 3.3 + Math.sin(t * 1.7) * 0.2, -0.6 + Math.sin(t) * 2.6);
        ray.rotation.set(Math.sin(time * 1.3) * 0.08, -t - Math.PI / 2, 0);
      }
      for (const jelly of jellies) jelly.position.y += Math.sin(time * mix(0.5, 1.6, energy) + jelly.userData.phase) * 0.0015;
      for (const [i, holder] of swayers.entries()) holder.rotation.z = Math.sin(time * mix(0.3, 1.2, energy) + i) * mix(0.03, 0.12, energy);
      for (const [i, shaft] of shafts.entries()) (shaft.material as THREE.MeshBasicMaterial).opacity = mix(0.05, 0.13, mood.cheer) * (a.water === 'dusk' ? 0.6 : 1) * (0.85 + Math.sin(time * 0.6 + i * 2) * 0.15);
    };
    swim(0);
    world.update = (_dt, time) => swim(time);
    return world;
  },
});
