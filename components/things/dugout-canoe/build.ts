import * as THREE from 'three';
import { choice, defineThing, disposeTree, mix, score, visibleBounds } from '@conjure/kit';

type P3 = readonly [number, number, number];

export default defineThing({
  questions: {
    cargo: choice('What is the canoe carrying?', {
      nothing: 'Nothing: bare hollowed wood.',
      nets: 'A heaped fishing net with its corks and floats.',
      fruit: 'Green bananas, coconuts and bright fruit bound for market.',
      catch: 'A basket of silver fish and a few loose on the bottom boards.',
      firewood: 'A bundle of cut mangrove poles lashed with cord.',
      jars: 'Water jugs and clay pots, a household errand.',
    }),
    mooring: choice('How is it kept, or not kept?', {
      tied: 'Tied by the bow to a stake pushed into the bottom.',
      adrift: 'Adrift, its frayed painter trailing in the water.',
      anchored: 'Held by a stone on a rope dropped off the bow.',
      beached: 'Pulled up and heeled over on a mud bar, waiting for the tide.',
    }),
    prow: choice('How is the hull finished?', {
      bare: 'Bare weathered wood from end to end.',
      'red-band': 'Bare wood with a red painted prow and a white band behind it.',
      eye: 'A white prow panel with a staring painted eye to see the way.',
      striped: 'A gunwale stripe in blocks of blue, yellow and white.',
      tarred: 'Tarred black all over with a white rail.',
      beak: 'Unpainted, with the prow carved up into a notched beak.',
    }),
    water: score('How much water is in the bottom?', ['Bailed bone dry', 'A puddle and a bailer', 'Ankle deep', 'Swamped to the rail']),
    tool: choice('What was left to move it with?', {
      paddle: 'A single leaf-bladed paddle laid across the gunwales.',
      pole: 'A long punting pole lying down the length of the hull.',
      both: 'Both a paddle and a pole.',
      none: 'Nothing: whatever moved it has gone.',
    }),
    left: choice('What did the owner leave behind on the seat?', {
      nothing: 'Nothing at all.',
      hat: 'A conical straw hat.',
      lantern: 'A small tin lantern for night fishing.',
      sandals: 'A pair of bright rubber sandals.',
      lunch: 'A leaf-wrapped parcel and a bottle.',
    }),
    slim: score('What are its proportions?', ['Short and tubby, one person', 'An ordinary family canoe', 'Long and needle-slim']),
  },

  build(a, context) {
    const { mood, random } = context;
    const root = new THREE.Group();
    const boat = new THREE.Group();
    root.add(boat);
    const L = mix(3.1, 5.6, a.slim), B = mix(0.78, 0.54, a.slim), D = 0.33, TH = 0.04;
    const beak = a.prow === 'beak';
    const paintOf = (color: THREE.ColorRepresentation, options: THREE.MeshStandardMaterialParameters = {}) => {
      const tint = new THREE.Color(color).lerp(new THREE.Color('#8b8478'), mood.wear * 0.25);
      return new THREE.MeshStandardMaterial({ color: tint, roughness: 0.6 + mood.wear * 0.3, ...options });
    };
    const put = <T extends THREE.Object3D>(parent: THREE.Object3D, node: T, at: P3 = [0, 0, 0]) => {
      node.position.set(...at);
      node.traverse((child) => { child.castShadow = child.receiveShadow = true; });
      parent.add(node);
      return node;
    };
    const rod = (parent: THREE.Object3D, from: P3, to: P3, r0: number, r1: number, material: THREE.Material, sides = 7) => {
      const p = new THREE.Vector3(...from), q = new THREE.Vector3(...to), span = q.clone().sub(p);
      const mesh = put(parent, new THREE.Mesh(new THREE.CylinderGeometry(r1, r0, span.length(), sides), material), p.add(q).multiplyScalar(0.5).toArray() as [number, number, number]);
      mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), span.normalize());
      return mesh;
    };
    const tube = (parent: THREE.Object3D, points: P3[], radius: number, material: THREE.Material) =>
      put(parent, new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p))), points.length * 6, radius, 6), material));

    // Hull sections: s runs from -1 at the stern to +1 at the bow.
    const section = (s: number) => {
      const e = Math.abs(s);
      const w = Math.max(0.022, (B / 2) * (1 - e ** 2.6) ** 0.55);
      const top = D + 0.15 * e ** 2.4 + (beak ? 0.34 * Math.max(0, s) ** 9 : 0);
      const keel = 0.2 * e ** 3;
      const hollow = 1 - THREE.MathUtils.smoothstep(e, 0.76, 0.9);
      const wi = Math.max(0.004, (w - TH) * hollow);
      const di = Math.max(0.002, (top - keel - TH * 1.3) * hollow);
      return { w, top, keel, wi, di };
    };
    const wood = new THREE.Color('#7b5a3a').lerp(new THREE.Color('#9a6a3c'), mood.warmth * 0.5).lerp(new THREE.Color('#8d8980'), mood.wear * 0.45);
    const inside = wood.clone().multiplyScalar(0.8);
    const colourAt = (s: number, outer: boolean, rail: boolean) => {
      if (!outer) return inside;
      if (a.prow === 'red-band') return s > 0.8 ? new THREE.Color('#c4302a') : s > 0.74 ? new THREE.Color('#efe9d8') : wood;
      if (a.prow === 'eye') return s > 0.66 ? new THREE.Color('#ece6d4') : s > 0.62 ? new THREE.Color('#1f4f8f') : wood;
      if (a.prow === 'striped') return rail ? new THREE.Color(['#2a69b8', '#f0c531', '#f2eee2'][Math.floor((s + 1) * 6) % 3]) : wood;
      if (a.prow === 'tarred') return rail ? new THREE.Color('#ebe6d8') : new THREE.Color('#25221f');
      return wood;
    };
    const stations = 46, arc = 9;
    const position: number[] = [], colour: number[] = [], index: number[] = [];
    const loop = (arc + 1) * 2;
    for (let i = 0; i <= stations; i++) {
      const s = (i / stations) * 2 - 1, k = section(s), z = s * L / 2;
      for (let j = 0; j <= arc; j++) {
        const phi = (j / arc) * Math.PI, dent = (random() - 0.5) * 0.012;
        position.push(-k.w * Math.cos(phi) + dent, k.top - (k.top - k.keel) * Math.sin(phi) ** 0.7 + dent, z);
        const c = colourAt(s, true, Math.sin(phi) < 0.5).clone().multiplyScalar(mix(0.88, 1.08, random()));
        colour.push(c.r, c.g, c.b);
      }
      for (let j = arc; j >= 0; j--) {
        const phi = (j / arc) * Math.PI, dent = (random() - 0.5) * 0.008;
        position.push(-k.wi * Math.cos(phi) + dent, k.top - k.di * Math.sin(phi) ** 0.7, z);
        const c = colourAt(s, false, false).clone().multiplyScalar(mix(0.88, 1.08, random()));
        colour.push(c.r, c.g, c.b);
      }
    }
    for (let i = 0; i < stations; i++)
      for (let j = 0; j < loop; j++) {
        const p = i * loop + j, q = i * loop + ((j + 1) % loop);
        index.push(p, q, p + loop, q, q + loop, p + loop);
      }
    const hullGeometry = new THREE.BufferGeometry();
    hullGeometry.setAttribute('position', new THREE.Float32BufferAttribute(position, 3));
    hullGeometry.setAttribute('color', new THREE.Float32BufferAttribute(colour, 3));
    hullGeometry.setIndex(index);
    hullGeometry.computeVertexNormals();
    put(boat, new THREE.Mesh(hullGeometry, new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, side: THREE.DoubleSide, roughness: 0.6 + mood.wear * 0.3 })));
    const plank = paintOf(wood.clone().multiplyScalar(1.12));
    const floorAt = (s: number) => { const k = section(s); return k.top - k.di; };
    const seats = [-0.5, 0.42];
    for (const s of seats) {
      const k = section(s);
      put(boat, new THREE.Mesh(new THREE.BoxGeometry(k.w * 2 - 0.02, 0.028, 0.2), plank), [0, k.top - 0.07, s * L / 2]);
    }
    if (a.prow === 'eye')
      for (const e of [-1, 1]) {
        const k = section(0.78);
        const white = put(boat, new THREE.Mesh(new THREE.CircleGeometry(0.06, 14), paintOf('#ffffff', { side: THREE.DoubleSide })), [e * (k.w + 0.012), k.top - 0.1, 0.78 * L / 2]);
        white.rotation.y = e * Math.PI / 2 - e * 0.2;
        white.scale.x = 1.5;
        const pupil = put(boat, new THREE.Mesh(new THREE.CircleGeometry(0.03, 12), paintOf('#101010', { side: THREE.DoubleSide })), [e * (k.w + 0.016), k.top - 0.1, 0.78 * L / 2 + 0.01]);
        pupil.rotation.y = e * Math.PI / 2 - e * 0.2;
      }
    if (beak) for (const s of [0.9, 0.94]) { const k = section(s); put(boat, new THREE.Mesh(new THREE.BoxGeometry(k.w * 2 + 0.03, 0.03, 0.03), paintOf(inside)), [0, k.top - 0.06, s * L / 2]); }

    // Water in the bottom.
    const tea = new THREE.MeshStandardMaterial({ color: new THREE.Color('#6a5334').lerp(new THREE.Color('#7f8f86'), 0.25), roughness: 0.06, metalness: 0.35 });
    const swamp = a.water;
    if (swamp > 0.2) {
      const depth = mix(0.03, D - 0.03 - TH * 1.3, THREE.MathUtils.smoothstep(swamp, 0.2, 1));
      const level = floorAt(0) + depth;
      const pts: number[] = [], idx: number[] = [];
      let n = 0;
      for (let i = 0; i <= 40; i++) {
        const s = (i / 40) * 1.8 - 0.9, k = section(s);
        const sine = ((k.top - level) / k.di) ** (1 / 0.7);
        const half = sine >= 1 || sine < 0 ? 0 : k.wi * Math.sqrt(1 - sine * sine);
        pts.push(-half, level, s * L / 2, half, level, s * L / 2);
        if (i > 0) idx.push(n - 2, n, n - 1, n - 1, n, n + 1);
        n += 2;
      }
      const sheet = new THREE.BufferGeometry();
      sheet.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
      sheet.setIndex(idx);
      sheet.computeVertexNormals();
      put(boat, new THREE.Mesh(sheet, tea));
      // The bailer: half a calabash, floating if there is enough to float in.
      const gourd = put(boat, new THREE.Mesh(new THREE.SphereGeometry(0.09, 12, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), paintOf('#c9a55a', { side: THREE.DoubleSide })), [0.04, level + 0.06, -0.12 * L]);
      gourd.rotation.set(0.3, random() * 3, 0.2);
    }

    // Cargo sits amidships.
    const amount = mix(0.6, 1.4, mood.density);
    const hold = (s: number, x = 0): P3 => [x, floorAt(s) + 0.01, s * L / 2];
    if (a.cargo === 'nets') {
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = 64;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = '#2f5f58'; ctx.fillRect(0, 0, 64, 64);
      ctx.strokeStyle = '#8fd0b8'; ctx.lineWidth = 3;
      for (let k = -1; k < 3; k++) { ctx.beginPath(); ctx.moveTo(k * 32, 0); ctx.lineTo(k * 32 + 64, 64); ctx.moveTo(k * 32 + 64, 0); ctx.lineTo(k * 32, 64); ctx.stroke(); }
      const mesh = new THREE.CanvasTexture(canvas);
      mesh.colorSpace = THREE.SRGBColorSpace;
      mesh.wrapS = mesh.wrapT = THREE.RepeatWrapping;
      mesh.repeat.set(10, 6);
      const netting = new THREE.MeshStandardMaterial({ map: mesh, roughness: 0.9 });
      const cork = paintOf(mood.cheer > 0.5 ? '#f08a2a' : '#e8e2d0');
      for (let i = 0; i < Math.round(4 * amount); i++) {
        const s = mix(-0.22, 0.2, random());
        const heap = put(boat, new THREE.Mesh(new THREE.SphereGeometry(1, 12, 8), netting), hold(s, (random() - 0.5) * 0.1));
        heap.scale.set(B * 0.36, mix(0.18, 0.3, random()), mix(0.3, 0.5, random()));
        heap.position.y += 0.08;
        for (let c = 0; c < 4; c++) put(boat, new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), cork), [(random() - 0.5) * B * 0.5, heap.position.y + heap.scale.y * mix(0.7, 0.95, random()), heap.position.z + (random() - 0.5) * 0.5]);
      }
      // A fold of net slung over the rail.
      const k = section(0.05);
      const fold = put(boat, new THREE.Mesh(new THREE.SphereGeometry(1, 10, 8), netting), [k.w, k.top - 0.06, 0.05 * L / 2]);
      fold.scale.set(0.06, 0.2, 0.34);
    } else if (a.cargo === 'fruit') {
      const balls: { at: [number, number, number]; size: number; color: string }[] = [];
      for (let i = 0; i < 26 * amount; i++) {
        const s = mix(-0.25, 0.2, random());
        const kind = random();
        balls.push({ at: [(random() - 0.5) * B * 0.45, floorAt(s) + 0.07 + random() * 0.16, s * L / 2], size: kind < 0.4 ? 0.085 : 0.05, color: kind < 0.2 ? '#6b4a2a' : kind < 0.4 ? '#7da33a' : kind < 0.7 ? '#f0a422' : kind < 0.85 ? '#e2452e' : '#f2d23c' });
      }
      const heap = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 10, 8), new THREE.MeshStandardMaterial({ roughness: 0.5 }), balls.length);
      const m = new THREE.Matrix4();
      balls.forEach((ball, i) => { heap.setMatrixAt(i, m.makeScale(ball.size, ball.size * 1.1, ball.size).setPosition(...ball.at)); heap.setColorAt(i, new THREE.Color(ball.color)); });
      put(boat, heap);
      const banana = new THREE.MeshStandardMaterial({ color: mood.cheer > 0.6 ? '#e8cf3a' : '#8fb23c', roughness: 0.5 });
      for (const s of [-0.34, 0.3]) {
        const bunch = new THREE.InstancedMesh(new THREE.CapsuleGeometry(0.022, 0.13, 3, 6), banana, 22);
        for (let i = 0; i < 22; i++) {
          const ring = Math.floor(i / 6), angle = (i % 6) / 6 * Math.PI * 2 + ring;
          const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.cos(angle) * 0.6, 0, Math.sin(angle) * 0.6 + Math.PI / 2));
          bunch.setMatrixAt(i, m.compose(new THREE.Vector3(-0.16 + ring * 0.1, 0.07 + Math.cos(angle) * 0.05, Math.sin(angle) * 0.06), q, new THREE.Vector3(1, 1, 1)));
        }
        put(boat, bunch, hold(s)).rotation.y = Math.PI / 2 + (random() - 0.5);
      }
    } else if (a.cargo === 'catch') {
      const basket = put(boat, new THREE.Mesh(new THREE.LatheGeometry([[0.14, 0], [0.2, 0.12], [0.21, 0.24], [0.19, 0.25], [0.17, 0.05], [0, 0.04]].map(([x, y]) => new THREE.Vector2(x, y)), 18), paintOf('#b98f4a', { side: THREE.DoubleSide, flatShading: true })), hold(-0.08));
      basket.scale.x = Math.min(1, (B * 0.42) / 0.21);
      const silver = new THREE.MeshStandardMaterial({ color: '#c9d3d8', metalness: 0.65, roughness: 0.3 });
      const n = Math.round(16 * amount);
      const fish = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 8, 6), silver, n);
      const m = new THREE.Matrix4();
      for (let i = 0; i < n; i++) {
        const inBasket = i < n * 0.65;
        const at = inBasket ? new THREE.Vector3((random() - 0.5) * 0.18, floorAt(-0.08) + 0.2 + random() * 0.07, -0.08 * L / 2 + (random() - 0.5) * 0.2) : new THREE.Vector3((random() - 0.5) * B * 0.3, floorAt(0.15) + 0.03, mix(0.08, 0.3, random()) * L / 2);
        fish.setMatrixAt(i, m.compose(at, new THREE.Quaternion().setFromEuler(new THREE.Euler(0, random() * 6, inBasket ? (random() - 0.5) * 0.8 : 0)), new THREE.Vector3(0.12, 0.022, 0.04)));
      }
      put(boat, fish);
    } else if (a.cargo === 'firewood') {
      const bark = paintOf('#7a4638'), cut = paintOf('#d6a878');
      const n = Math.round(13 * amount);
      for (let i = 0; i < n; i++) {
        const row = Math.floor(i / 5), x = ((i % 5) - 2) * 0.075 * (1 - row * 0.2), len = mix(1.2, 1.7, random()), z = (random() - 0.5) * 0.2;
        const y = floorAt(0) + 0.05 + row * 0.07;
        rod(boat, [x, y, z - len / 2], [x + (random() - 0.5) * 0.04, y, z + len / 2], 0.036, 0.03, bark);
        put(boat, new THREE.Mesh(new THREE.CircleGeometry(0.03, 7), cut), [x, y, z + len / 2 + 0.002]);
      }
      for (const z of [-0.4, 0.4]) put(boat, new THREE.Mesh(new THREE.TorusGeometry(0.19, 0.012, 5, 16), paintOf('#d9c9a0')), [0, floorAt(0) + 0.1, z]).scale.set(1.05, 0.62, 1);
    } else if (a.cargo === 'jars') {
      const clay = paintOf('#b5633f'), jerry = paintOf(mood.cheer > 0.5 ? '#f0c52c' : '#3f78b8', { roughness: 0.4 });
      const n = Math.round(4 * amount);
      for (let i = 0; i < n; i++) {
        const s = mix(-0.28, 0.22, (i + 0.5) / n);
        if (i % 2 === 0) {
          put(boat, new THREE.Mesh(new THREE.LatheGeometry([[0.05, 0], [0.13, 0.1], [0.14, 0.2], [0.08, 0.3], [0.06, 0.34], [0.085, 0.37]].map(([x, y]) => new THREE.Vector2(x, y)), 14), clay), hold(s));
        } else {
          const can = put(boat, new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.3, 0.14), jerry), hold(s));
          can.position.y += 0.15;
          can.rotation.y = random() * 0.6;
          put(boat, new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.05, 8), paintOf('#d8302a')), [can.position.x + 0.05, can.position.y + 0.17, can.position.z]);
          put(boat, new THREE.Mesh(new THREE.TorusGeometry(0.04, 0.012, 5, 10, Math.PI), jerry), [can.position.x - 0.03, can.position.y + 0.15, can.position.z]);
        }
      }
    }

    // Paddle and pole.
    const handle = paintOf('#b08a56');
    if (a.tool === 'paddle' || a.tool === 'both') {
      const k = section(0.2);
      const y = k.top + 0.02, z = 0.2 * L / 2;
      const from: P3 = [-k.w - 0.5, y + 0.01, z + 0.25], to: P3 = [k.w + 0.35, y, z - 0.18];
      rod(boat, from, to, 0.02, 0.02, handle);
      const blade = put(boat, new THREE.Mesh(new THREE.SphereGeometry(1, 12, 8), handle), [to[0] + 0.24, y, to[2] - 0.11]);
      blade.scale.set(0.3, 0.012, 0.1);
      blade.rotation.y = Math.atan2(-(to[2] - from[2]), to[0] - from[0]);
      put(boat, new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.035, 0.11), handle), [from[0], from[1], from[2]]).rotation.y = blade.rotation.y;
    }
    if (a.tool === 'pole' || a.tool === 'both') {
      const x = section(0).w * 0.45;
      rod(boat, [x, section(-0.9).top + 0.03, -L / 2 - 0.7], [x * 0.6, section(0.42).top - 0.03, L * 0.36], 0.028, 0.02, paintOf('#a98f5c'));
    }

    // Left behind on the stern seat.
    const seat: P3 = [0, section(seats[0]).top - 0.055, seats[0] * L / 2];
    if (a.left === 'hat') {
      put(boat, new THREE.Mesh(new THREE.ConeGeometry(0.24, 0.13, 20), paintOf('#d9c078', { flatShading: true })), [seat[0] + 0.03, seat[1] + 0.065, seat[2]]).rotation.z = 0.08;
    } else if (a.left === 'lantern') {
      const tin = paintOf('#6f7a78', { metalness: 0.6, roughness: 0.4 });
      put(boat, new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.04, 10), tin), [seat[0], seat[1] + 0.02, seat[2]]);
      put(boat, new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.05, 0.11, 10), new THREE.MeshStandardMaterial({ color: '#ffd98a', emissive: '#ffb347', emissiveIntensity: mix(0.3, 1.6, Math.abs(mood.daylight - 0.5) * 2), roughness: 0.2 })), [seat[0], seat[1] + 0.095, seat[2]]);
      put(boat, new THREE.Mesh(new THREE.ConeGeometry(0.065, 0.05, 10), tin), [seat[0], seat[1] + 0.175, seat[2]]);
      put(boat, new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.006, 5, 14, Math.PI), tin), [seat[0], seat[1] + 0.19, seat[2]]);
    } else if (a.left === 'sandals') {
      const rubber = paintOf(mood.cheer > 0.5 ? '#ef4f9a' : '#2f8fd0');
      for (const e of [-1, 1]) {
        const sole = put(boat, new THREE.Mesh(new THREE.CapsuleGeometry(0.045, 0.13, 3, 8), rubber), [seat[0] + e * 0.08, seat[1] + 0.012, seat[2] + e * 0.03]);
        sole.scale.z = 0.25;
        sole.rotation.set(Math.PI / 2, 0, e * 0.25 + 0.3);
      }
    } else if (a.left === 'lunch') {
      put(boat, new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.07, 0.13), paintOf('#4f7a34')), [seat[0] - 0.08, seat[1] + 0.035, seat[2]]).rotation.y = 0.4;
      put(boat, new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.006, 4, 10), paintOf('#d9c9a0')), [seat[0] - 0.08, seat[1] + 0.035, seat[2]]).rotation.y = 0.4;
      put(boat, new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.17, 10), paintOf('#3f7f5a', { roughness: 0.15 })), [seat[0] + 0.12, seat[1] + 0.085, seat[2]]);
      put(boat, new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.03, 0.07, 8), paintOf('#3f7f5a', { roughness: 0.15 })), [seat[0] + 0.12, seat[1] + 0.2, seat[2]]);
    }

    // How it sits: afloat with a waterline at y = 0, or hauled up on mud.
    const beached = a.mooring === 'beached';
    const draft = beached ? 0.02 : mix(0.1, 0.26, THREE.MathUtils.smoothstep(swamp, 0.3, 1)) + (a.cargo === 'nothing' ? 0 : 0.03);
    boat.position.y = -draft;
    const turn = -0.5 + (a.mooring === 'adrift' ? 0.45 : 0) + (random() - 0.5) * 0.2;
    boat.rotation.y = turn;
    boat.rotation.z = beached ? (random() < 0.5 ? -1 : 1) * mix(0.2, 0.32, random()) : (random() - 0.5) * 0.05;
    const world = (local: P3) => boat.localToWorld(new THREE.Vector3(...local));
    boat.updateMatrixWorld(true);
    const bow = world([0, section(0.96).top - 0.03, 0.96 * L / 2]);
    const ropePaint = paintOf('#cdb98a');
    const stakePaint = paintOf('#5d4a3a');
    if (beached) {
      const mudPaint = new THREE.MeshStandardMaterial({ color: new THREE.Color('#6c5a48').lerp(new THREE.Color('#7f5f40'), mood.warmth * 0.5), roughness: 0.35, metalness: 0.1 });
      const bar = put(root, new THREE.Mesh(new THREE.LatheGeometry([[1.02, -0.06], [0.95, -0.02], [0.7, 0.0], [0, 0.005]].map(([x, y]) => new THREE.Vector2(x, y)), 36), mudPaint));
      bar.scale.set(B / 2 + 0.7, 1, L / 2 + 0.45);
      bar.rotation.y = turn;
      bar.position.y = 0.06;
      boat.position.y += 0.08;
      // A drag furrow behind the stern.
      const stern = world([0, 0, -L / 2]);
      const furrow = put(root, new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.012, L * 0.22), paintOf('#3f342a', { roughness: 0.3 })), [stern.x * 1.08, 0.066, stern.z * 1.08]);
      furrow.rotation.y = turn;
      const stake = new THREE.Vector3(bow.x + 0.5, 0, bow.z + 0.5);
      rod(root, [stake.x, -0.3, stake.z], [stake.x + 0.08, 0.75, stake.z], 0.035, 0.028, stakePaint);
      tube(root, [[bow.x, bow.y + 0.08, bow.z], [(bow.x + stake.x) / 2, 0.12, (bow.z + stake.z) / 2], [stake.x + 0.04, 0.45, stake.z]], 0.012, ropePaint);
    } else {
      const sheet = put(root, new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 0.006, 40), tea), [0, 0.001, 0]);
      sheet.scale.set(B / 2 + 0.6, 1, L / 2 + 0.5);
      sheet.rotation.y = turn;
      const ripple = new THREE.MeshStandardMaterial({ color: '#9a9878', roughness: 0.2 });
      for (let i = 0; i < 3; i++) {
        const ring = put(root, new THREE.Mesh(new THREE.TorusGeometry(1, 0.012, 4, 60), ripple), [0, 0.004, 0]);
        ring.rotation.set(Math.PI / 2, 0, -turn);
        ring.scale.set((B / 2 + 0.08 + i * 0.15) * (1 + mood.energy * 0.1), L / 2 + 0.06 + i * 0.15, 0.1);
      }
      if (a.mooring === 'tied') {
        const stake = new THREE.Vector3(bow.x + 0.35, 0, bow.z + 0.75);
        rod(root, [stake.x - 0.1, -0.4, stake.z], [stake.x + 0.12, 1.75, stake.z + 0.05], 0.045, 0.032, stakePaint);
        tube(root, [[bow.x, bow.y + 0.06, bow.z], [(bow.x + stake.x) / 2, 0.16, (bow.z + stake.z) / 2], [stake.x + 0.03, 0.62, stake.z]], 0.013, ropePaint);
        for (const y of [0.58, 0.63, 0.68]) put(root, new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.013, 5, 12), ropePaint), [stake.x + 0.03, y, stake.z + 0.01]).rotation.x = Math.PI / 2;
        // Tide marks on the stake.
        put(root, new THREE.Mesh(new THREE.CylinderGeometry(0.046, 0.05, 0.3, 7), paintOf('#3d4a34')), [stake.x - 0.02, 0.14, stake.z]);
      } else if (a.mooring === 'adrift') {
        const side = new THREE.Vector3(Math.cos(turn), 0, -Math.sin(turn));
        tube(root, [[bow.x, bow.y + 0.05, bow.z], [bow.x + side.x * 0.25, 0.03, bow.z + side.z * 0.25 + 0.1], [bow.x + side.x * 0.7, 0.012, bow.z + side.z * 0.7 - 0.1], [bow.x + side.x * 1.0, 0.012, bow.z + side.z * 1.0 + 0.25], [bow.x + side.x * 1.35, 0.012, bow.z + side.z * 1.35]], 0.013, ropePaint);
        // Fallen leaves gathering against the hull say how long it has drifted.
        for (let i = 0; i < 5 + mood.wear * 8; i++) {
          const leaf = put(root, new THREE.Mesh(new THREE.CircleGeometry(0.05, 6), paintOf(random() < 0.5 ? '#d7a82c' : '#6f8c3a', { side: THREE.DoubleSide })), [side.x * (B / 2 + 0.1 + random() * 0.3) + Math.sin(turn) * (random() - 0.5) * L * 0.7, 0.008, side.z * (B / 2 + 0.1 + random() * 0.3) + Math.cos(turn) * (random() - 0.5) * L * 0.7]);
          leaf.rotation.set(-Math.PI / 2, 0, random() * 6);
          leaf.scale.y = 0.5;
        }
      } else {
        const stone = new THREE.Vector3(bow.x + 0.3, 0, bow.z + 0.8);
        tube(root, [[bow.x, bow.y + 0.05, bow.z], [(bow.x + stone.x) / 2, 0.2, (bow.z + stone.z) / 2], [stone.x, 0.02, stone.z]], 0.013, ropePaint);
        put(root, new THREE.Mesh(new THREE.DodecahedronGeometry(0.2, 0), paintOf('#77766e', { flatShading: true })), [stone.x, -0.04, stone.z]).scale.y = 0.6;
        put(root, new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.006, 4, 30), ripple), [stone.x, 0.004, stone.z]).rotation.x = Math.PI / 2;
      }
    }

    // Centre the whole arrangement on the origin; the waterline stays at y = 0.
    root.updateMatrixWorld(true);
    const bounds = visibleBounds(root);
    const centre = bounds.getCenter(new THREE.Vector3());
    for (const child of root.children) { child.position.x -= centre.x; child.position.z -= centre.z; }
    const baseY = boat.position.y, baseRoll = boat.rotation.z;
    const sway = beached ? 0 : mix(0.2, 1.4, mood.energy);
    return {
      object: root,
      footprint: L * 0.5,
      update: (_dt, time) => {
        boat.position.y = baseY + Math.sin(time * 1.1) * 0.012 * sway;
        boat.rotation.z = baseRoll + Math.sin(time * 0.8 + 1) * 0.03 * sway;
      },
      dispose: () => disposeTree(root),
    };
  },
});
