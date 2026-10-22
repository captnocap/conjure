import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul, score } from '@conjure/kit';

const ROSETTES = {
  blue: 'Blue: first place.',
  red: 'Red: second place.',
  white: 'White: third.',
  purple: 'Purple and gold with a banner: grand champion.',
  green: 'Green: participation, everybody gets one.',
  none: 'No ribbon this year.',
} as const;
const ROSETTE_COLOURS = { blue: '#2452b8', red: '#c8302c', white: '#f2efe6', purple: '#6a2f9e', green: '#2f8f4e', yellow: '#e8c22e', pink: '#e86a9a' } as const;
const CARDS = { club: '4-H CLUB', ffa: 'FFA CHAPTER', sold: 'SOLD THANK YOU', feed: 'DO NOT FEED', nap: 'SHH SLEEPING' } as const;

export default defineThing({
  questions: {
    animal: choice('Which animal has this pen been home to?', {
      steer: 'A market steer: a rope halter on the rail, a big rubber water tub, a long show stick.',
      sheep: 'A lamb: a trimming stand, tufts of wool in the straw.',
      pig: 'A hog: pale wood shavings, a red pig board and a cane.',
      goat: 'A goat: a collar and chain on the rail and a chewed mineral block.',
      dairy: 'A dairy heifer: a steel milk can and a three-legged stool.',
    }),
    rosette: choice('What colour is the main rosette clipped to the rail?', ROSETTES),
    ribbons: score('How many other ribbons hang beside it?', ['None', 'One or two', 'A handful', 'A whole row from years of showing']),
    state: choice('What state is the pen in?', {
      showday: 'Show morning: bedding fluffed deep and gold, everything squared away.',
      lived: 'Mid-week: a flattened hollow where the animal sleeps, gate ajar.',
      auction: 'After the sale: gate swung wide, bedding kicked about, halter left behind.',
      swept: 'Fair over: swept back to bare concrete with a last heap of straw in the corner.',
    }),
    rails: choice('What are the pen panels made of?', {
      galvanised: 'Galvanised steel pipe, grey and dull.',
      green: 'Pipe painted farm-implement green.',
      red: 'Pipe painted red, chipped at the welds.',
      boards: 'White-painted wooden boards on square posts.',
    }),
    card: choice('What does the pen card on the gate say?', CARDS),
    chair: noul('Is there a folding chair where a kid has been keeping watch?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const W = 3, D = 2.6, H = 1.2, hw = W / 2, hd = D / 2;
    const wood = a.rails === 'boards';
    const rail = wood ? s.material('#ece7da') : s.material({ galvanised: '#a9afb2', green: '#2f7a3e', red: '#b3302a' }[a.rails as 'galvanised' | 'green' | 'red'], { metalness: a.rails === 'galvanised' ? 0.7 : 0.3, roughness: 0.45 });
    const steel = s.material('#a9afb2', { metalness: 0.7, roughness: 0.4 });
    const dark = s.material('#252527');
    const rubber = s.material('#1e1f22', { roughness: 0.9 });
    const strawTint = a.animal === 'pig' ? '#e6cf9c' : '#d9b54a';
    const straw = s.material(strawTint, { flatShading: true, roughness: 1 });

    // Concrete pad.
    s.box([W + 0.5, 0.06, D + 0.5], [0, 0.03, 0], s.material('#a7a59c'));

    // Panels. A panel runs between two points; the gate is the right half of the front.
    const panel = (group: THREE.Object3D, from: [number, number], to: [number, number]) => {
      const add = <T extends THREE.Object3D>(m: T) => { group.add(m); return m; };
      const len = Math.hypot(to[0] - from[0], to[1] - from[1]);
      const n = wood ? 4 : 5;
      for (let i = 0; i < n; i++) {
        const y = 0.28 + i * (H - 0.3) / (n - 1);
        if (wood) { const b = add(s.box([len, 0.13, 0.03], [(from[0] + to[0]) / 2, y, (from[1] + to[1]) / 2], rail)); b.rotation.y = -Math.atan2(to[1] - from[1], to[0] - from[0]); }
        else add(s.rod([from[0], y, from[1]], [to[0], y, to[1]], i === n - 1 ? 0.024 : 0.017, rail));
      }
      for (const t of wood ? [0.5] : [0.33, 0.66]) {
        const x = mix(from[0], to[0], t), z = mix(from[1], to[1], t);
        if (wood) add(s.box([0.09, H, 0.05], [x, H / 2 + 0.06, z], rail)); else add(s.rod([x, 0.28, z], [x, H - 0.02, z], 0.014, rail));
      }
    };
    const corners: [number, number][] = [[-hw, -hd], [hw, -hd], [hw, hd], [-hw, hd]];
    for (const [x, z] of [...corners, [0, hd] as [number, number]]) {
      if (wood) s.box([0.11, H + 0.15, 0.11], [x, (H + 0.15) / 2 + 0.06, z], rail); else { s.cylinder(0.03, 0.03, H + 0.1, [x, (H + 0.1) / 2 + 0.06, z], rail, 10); s.cylinder(0.07, 0.07, 0.02, [x, 0.07, z], rail, 10); }
    }
    panel(s.root, corners[0], corners[1]);
    panel(s.root, corners[1], corners[2]);
    panel(s.root, corners[3], corners[0]);
    panel(s.root, corners[3], [0, hd]);
    const gate = new THREE.Group();
    gate.position.set(hw, 0, hd);
    panel(gate, [-hw, 0], [0, 0]);
    const swing = a.state === 'auction' ? mix(1.3, 1.9, random()) : a.state === 'lived' ? mix(0.15, 0.4, random()) : a.state === 'swept' ? mix(0.6, 1.5, random()) : 0;
    gate.rotation.y = -swing;
    s.root.add(gate);
    if (!swing) s.tube([[0.03, H - 0.1, hd + 0.03], [0.0, H - 0.25, hd + 0.05], [-0.04, H - 0.1, hd + 0.03]], 0.008, dark);

    // Bedding.
    const bedded = a.state !== 'swept';
    const depth = a.state === 'showday' ? 0.22 : a.state === 'lived' ? 0.16 : 0.1;
    const stalks: THREE.Matrix4[] = [];
    const q = new THREE.Quaternion(), e = new THREE.Euler();
    const stalk = (x: number, y: number, z: number, flat = 0.5) => {
      e.set((random() - 0.5) * flat, random() * Math.PI, (random() - 0.5) * flat);
      stalks.push(new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), q.setFromEuler(e), new THREE.Vector3(mix(0.6, 1.4, random()), 1, 1)));
    };
    if (bedded) {
      const bedGeo = new THREE.BoxGeometry(W - 0.12, depth, D - 0.12, 12, 1, 10);
      const pos = bedGeo.attributes.position;
      const hollowX = (random() - 0.5) * 0.8, hollowZ = -0.25 + (random() - 0.5) * 0.5;
      for (let i = 0; i < pos.count; i++) {
        if (pos.getY(i) < 0) continue;
        const x = pos.getX(i), z = pos.getZ(i);
        const edge = Math.min(hw - 0.06 - Math.abs(x), hd - 0.06 - Math.abs(z));
        let y = depth / 2 + (random() - 0.5) * depth * (a.state === 'auction' ? 0.9 : 0.45) - (edge < 0.05 ? depth * 0.4 : 0);
        if (a.state === 'lived') y -= depth * 0.8 * Math.max(0, 1 - Math.hypot((x - hollowX) / 0.95, (z - hollowZ) / 0.65));
        pos.setY(i, y);
      }
      bedGeo.computeVertexNormals();
      s.mesh(bedGeo, straw, [0, 0.06 + depth / 2, 0]);
      const n = Math.round(mix(120, 260, mood.density));
      for (let i = 0; i < n; i++) stalk((random() - 0.5) * (W - 0.2), 0.07 + depth * mix(0.75, 1.15, random()), (random() - 0.5) * (D - 0.2));
      // Kicked out under the rails.
      const spill = a.state === 'auction' ? 70 : 22;
      for (let i = 0; i < spill; i++) stalk((random() - 0.5) * (W + 0.9), 0.07, hd + random() * (a.state === 'auction' ? 0.9 : 0.3), 0.1);
    } else {
      const heapGeo = new THREE.SphereGeometry(0.55, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2);
      const pos = heapGeo.attributes.position;
      for (let i = 0; i < pos.count; i++) pos.setXYZ(i, pos.getX(i) * mix(0.8, 1.2, random()), pos.getY(i) * 0.6 * mix(0.7, 1.2, random()), pos.getZ(i) * mix(0.8, 1.2, random()));
      heapGeo.computeVertexNormals();
      s.mesh(heapGeo, straw, [-hw + 0.6, 0.06, -hd + 0.6]);
      for (let i = 0; i < 60; i++) { const r = random() * 0.9, t = random() * Math.PI / 2; stalk(-hw + 0.3 + Math.cos(t) * r * 1.4, 0.07 + Math.max(0, 0.3 - r * 0.4) * random(), -hd + 0.3 + Math.sin(t) * r * 1.4, 0.3); }
      for (let i = 0; i < 25; i++) stalk((random() - 0.5) * W, 0.065, (random() - 0.5) * D, 0.05);
      // Push broom leaning in the corner.
      s.rod([hw - 0.25, 0.1, -hd + 0.5], [hw - 0.05, 1.45, -hd + 0.1], 0.016, s.material('#b08d57'));
      s.box([0.45, 0.07, 0.08], [hw - 0.26, 0.1, -hd + 0.52], s.material('#7a3d2a'));
    }
    if (stalks.length) {
      const mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(0.2, 0.008, 0.012), new THREE.MeshStandardMaterial({ color: new THREE.Color(strawTint).multiplyScalar(1.12), roughness: 1 }), stalks.length);
      stalks.forEach((m, i) => { mesh.setMatrixAt(i, m); mesh.setColorAt(i, new THREE.Color(strawTint).multiplyScalar(mix(0.8, 1.2, random()))); });
      mesh.castShadow = mesh.receiveShadow = true;
      s.root.add(mesh);
    }
    const top = 0.06 + (bedded ? depth : 0);

    // Feed bucket hooked on the back rail, or tipped in the bedding after the sale.
    const bucketColour = ['#c8302c', '#2f6fc9', '#2b2c2f', '#e8842c'][Math.floor(random() * 4)];
    const bucket = new THREE.Group();
    const bm = s.material(bucketColour, { roughness: 0.7, side: THREE.DoubleSide });
    const shell = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.15, 0.3, 16, 1, true), bm);
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.02, 16), bm); base.position.y = -0.14;
    const feed = new THREE.Mesh(new THREE.CylinderGeometry(0.175, 0.17, 0.02, 16), s.material('#b98f4a')); feed.position.y = a.state === 'showday' ? 0.06 : -0.08;
    const handle = new THREE.Mesh(new THREE.TorusGeometry(0.19, 0.008, 6, 20, Math.PI), steel); handle.position.y = 0.14; handle.rotation.y = Math.PI / 2;
    for (const m of [shell, base, feed, handle]) { m.castShadow = true; bucket.add(m); }
    if (a.state === 'auction' || a.state === 'swept') { bucket.position.set(-0.6 + random() * 0.4, top + 0.17, 0.3 + random() * 0.4); bucket.rotation.set(Math.PI / 2 - 0.15, 0, random() * 3); handle.rotation.x = 1.2; }
    else { bucket.position.set(-hw + 0.75, 0.75, -hd + 0.2); handle.rotation.x = -0.25; }
    s.root.add(bucket);

    // What the animal left.
    const halter = (x: number, z: number, colour: string) => {
      const rope = s.material(colour, { roughness: 0.9 });
      const loop = s.ring(0.14, 0.014, [x, H - 0.16, z], rope); loop.scale.y = 1.3;
      s.tube([[x + 0.05, H - 0.32, z], [x + 0.1, H - 0.7, z + 0.03], [x + 0.02, 0.5, z + 0.05], [x + 0.2, top + 0.03, z + 0.2], [x + 0.6, top + 0.02, z + 0.25]], 0.012, rope);
    };
    if (a.animal === 'steer') {
      halter(hw - 0.7, -hd + 0.05, '#2f6fc9');
      s.mesh(new THREE.CylinderGeometry(0.42, 0.36, 0.34, 20, 1, true), s.material('#1e1f22', { roughness: 0.9, side: THREE.DoubleSide }), [hw - 0.6, top + 0.12, hd - 0.6]);
      s.cylinder(0.4, 0.4, 0.02, [hw - 0.6, top + 0.2, hd - 0.6], s.material('#5d7f93', { roughness: 0.08, metalness: 0.3 }), 20);
      s.rod([-hw + 0.25, top, hd - 0.3], [-hw + 0.04, 1.5, hd - 0.06], 0.012, steel);
      s.rod([-hw + 0.04, 1.5, hd - 0.06], [-hw + 0.12, 1.46, hd - 0.1], 0.01, steel);
      s.cylinder(0.02, 0.02, 0.22, [-hw + 0.215, top + 0.12, hd - 0.26], rubber, 8).rotation.set(-0.17, 0, 0.14);
    } else if (a.animal === 'sheep') {
      const sx = hw - 0.75, sz = -hd + 0.7;
      s.box([0.55, 0.04, 1.0], [sx, top + 0.45, sz], steel);
      for (const x of [-1, 1]) for (const z of [-1, 1]) s.rod([sx + x * 0.24, top + 0.45, sz + z * 0.45], [sx + x * 0.3, top - 0.02, sz + z * 0.5], 0.015, steel);
      s.rod([sx, top + 0.45, sz + 0.48], [sx, top + 1.15, sz + 0.48], 0.018, steel);
      s.ring(0.11, 0.012, [sx, top + 1.2, sz + 0.48], steel, Math.PI).rotation.z = Math.PI;
      const wool = s.material('#f1ede1', { roughness: 1 });
      for (let i = 0; i < 9; i++) s.ball([0.07 + random() * 0.06, 0.05, 0.07 + random() * 0.05], [(random() - 0.5) * 2, top + 0.03, (random() - 0.5) * 1.6], wool, 8);
      s.box([0.5, 0.02, 0.36], [-0.4, H + 0.01, -hd], s.material('#3a5c8a')).rotation.x = 0.0;
      s.box([0.5, 0.36, 0.02], [-0.4, H - 0.17, -hd + 0.03], s.material('#3a5c8a'));
    } else if (a.animal === 'pig') {
      const board = s.box([0.9, 0.7, 0.025], [hw - 0.07, top + 0.4, -0.2], s.material('#c8302c'));
      board.rotation.set(0, Math.PI / 2, 0); board.rotation.z = 0; board.rotation.x = 0;
      board.rotation.order = 'YXZ'; board.rotation.x = -0.12;
      s.box([0.03, 0.06, 0.22], [hw - 0.11, top + 0.63, -0.2], dark);
      s.rod([-hw + 0.3, top, hd - 0.25], [-hw + 0.05, 1.05, hd - 0.05], 0.009, s.material('#c9a15a'));
      s.box([0.9, 0.16, 0.34], [-0.2, top + 0.06, -hd + 0.3], s.material('#8a8f92', { metalness: 0.5 }));
      s.box([0.82, 0.02, 0.26], [-0.2, top + 0.12, -hd + 0.3], s.material('#b98f4a'));
    } else if (a.animal === 'goat') {
      s.ring(0.09, 0.012, [hw - 0.5, H - 0.12, -hd + 0.04], s.material('#c8302c'));
      for (let i = 0; i < 9; i++) s.ring(0.02, 0.005, [hw - 0.5 + Math.sin(i) * 0.01, H - 0.24 - i * 0.045, -hd + 0.05], steel).rotation.y = i % 2 ? Math.PI / 2 : 0;
      const block = s.box([0.22, 0.2, 0.22], [0.5, top + 0.08, -0.4], s.material('#b86a52', { roughness: 1 }));
      block.rotation.y = random();
      s.ball([0.09, 0.08, 0.09], [0.57, top + 0.17, -0.34], straw, 6);
      s.box([0.6, 0.35, 0.6], [-hw + 0.5, top + 0.17, -hd + 0.5], s.material('#8c6b48'));
    } else {
      s.lathe([[0, 0], [0.16, 0], [0.17, 0.42], [0.1, 0.52], [0.1, 0.6], [0.13, 0.62], [0, 0.62]], steel, [hw - 0.45, top - 0.02, hd - 0.45]);
      for (const x of [-1, 1]) s.ring(0.03, 0.008, [hw - 0.45 + x * 0.14, top + 0.5, hd - 0.45], steel).rotation.y = Math.PI / 2;
      const sx = hw - 1.0, sz = hd - 0.9;
      s.cylinder(0.17, 0.17, 0.04, [sx, top + 0.3, sz], s.material('#8c6b48'), 14);
      for (let i = 0; i < 3; i++) s.rod([sx + Math.cos(i * 2.1) * 0.1, top + 0.29, sz + Math.sin(i * 2.1) * 0.1], [sx + Math.cos(i * 2.1) * 0.17, top - 0.02, sz + Math.sin(i * 2.1) * 0.17], 0.018, s.material('#8c6b48'));
      halter(-hw + 0.6, -hd + 0.05, '#e6e0cf');
    }
    if (a.state === 'auction' && a.animal !== 'steer' && a.animal !== 'dairy') halter(hw - 0.4, -hd + 0.05, '#2f6fc9');

    // Rosettes on the fixed half of the front rail.
    const ry = wood ? H - 0.02 : H - 0.05;
    const rosette = (x: number, colour: string, size: number, tiers: number) => {
      const m = new THREE.MeshStandardMaterial({ color: colour, roughness: 0.4, side: THREE.DoubleSide });
      const z = hd + 0.035;
      const scallop = new THREE.Shape();
      for (let i = 0; i <= 28; i++) { const t = i / 28 * Math.PI * 2, r = size * (1 + 0.1 * Math.cos(t * 14)); if (i) scallop.lineTo(Math.cos(t) * r, Math.sin(t) * r); else scallop.moveTo(r, 0); }
      const y = ry - size * 0.6;
      s.mesh(new THREE.ShapeGeometry(scallop), m, [x, y, z]);
      if (tiers > 1) s.mesh(new THREE.CircleGeometry(size * 0.72, 16), new THREE.MeshStandardMaterial({ color: '#e8c22e', roughness: 0.4 }), [x, y, z + 0.004]);
      s.mesh(new THREE.CircleGeometry(size * 0.45, 14), new THREE.MeshStandardMaterial({ color: tiers > 1 ? colour : '#f3ead0', roughness: 0.5 }), [x, y, z + 0.008]);
      const tails = tiers > 1 ? 3 : 2;
      for (let i = 0; i < tails; i++) {
        const k = i - (tails - 1) / 2, len = size * mix(2.6, 3.4, random());
        const tail = s.box([size * 0.5, len, 0.004], [x + k * size * 0.5, y - len / 2 - size * 0.3, z - 0.002 * (i + 1)], i === 1 && tails === 3 ? new THREE.MeshStandardMaterial({ color: '#e8c22e', roughness: 0.4 }) : m);
        tail.rotation.z = k * 0.16;
      }
    };
    const fixed = [-hw + 0.25, -0.2];
    if (a.rosette !== 'none') rosette(fixed[0] + 0.25, ROSETTE_COLOURS[a.rosette], a.rosette === 'purple' ? 0.22 : 0.17, a.rosette === 'purple' ? 2 : 1);
    const others = Math.round(a.ribbons * 7);
    const pool = ['blue', 'red', 'white', 'green', 'yellow', 'pink'] as const;
    for (let i = 0; i < others; i++) {
      const x = i < 4 ? fixed[0] + 0.62 + i * 0.24 : -hw - 0.035;
      if (i < 4) rosette(x, ROSETTE_COLOURS[pool[Math.floor(random() * pool.length)]], 0.095, 1);
      else { const flat = s.box([0.004, 0.42, 0.07], [x, ry - 0.25, hd - 0.3 - (i - 4) * 0.16], new THREE.MeshStandardMaterial({ color: ROSETTE_COLOURS[pool[Math.floor(random() * pool.length)]], roughness: 0.4 })); flat.rotation.x = (random() - 0.5) * 0.1; }
    }
    if (a.rosette === 'purple') s.label('GRAND CHAMPION', 1.25, 0.2, [-hw / 2, H + 0.2, hd + 0.02], '#e8c22e', '#6a2f9e');

    // Pen card on the gate.
    const cardText = CARDS[a.card];
    const card = s.label(cardText, 0.5, 0.3, [-hw / 2, 0.72, 0.03], a.card === 'sold' ? '#c8302c' : '#1f4f2f', '#fbf6e4');
    gate.add(card);
    card.rotation.z = (random() - 0.5) * 0.12 * (1 + mood.wear * 2);

    // Box fan zip-tied to the rail when it is hot.
    let blades: THREE.Object3D | null = null;
    if (mood.warmth > 0.55 && a.state !== 'swept') {
      const fx = 0.5, fz = -hd - 0.08;
      s.box([0.52, 0.52, 0.03], [fx, H - 0.3, fz - 0.06], s.material('#e8e4da'));
      for (const d of [[0.52, 0.04, 0.14, 0, 0.24], [0.52, 0.04, 0.14, 0, -0.24], [0.04, 0.52, 0.14, 0.24, 0], [0.04, 0.52, 0.14, -0.24, 0]]) s.box([d[0], d[1], d[2]], [fx + d[3], H - 0.3 + d[4], fz], s.material('#e8e4da'));
      blades = new THREE.Group();
      for (let i = 0; i < 4; i++) { const b = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.09, 0.01), s.material('#5b6d7c')); b.position.set(Math.cos(i * Math.PI / 2) * 0.11, Math.sin(i * Math.PI / 2) * 0.11, 0); b.rotation.set(0.3, 0, i * Math.PI / 2); blades.add(b); }
      blades.position.set(fx, H - 0.3, fz + 0.02);
      s.root.add(blades);
    }

    // Outside the pen: chair, hay bale, fork.
    if (a.chair) {
      const cx = -hw - 0.55, cz = hd + 0.15, cm = s.material('#7c8389', { metalness: 0.5 });
      const g = new THREE.Group();
      const add = (m: THREE.Object3D) => g.add(m);
      add(s.box([0.42, 0.03, 0.4], [0, 0.45, 0], s.material('#3a5c8a')));
      add(s.box([0.42, 0.22, 0.03], [0, 0.78, -0.21], s.material('#3a5c8a')));
      for (const x of [-1, 1]) { add(s.rod([x * 0.2, 0, 0.22], [x * 0.2, 0.9, -0.22], 0.012, cm)); add(s.rod([x * 0.2, 0, -0.2], [x * 0.2, 0.45, 0.18], 0.012, cm)); }
      add(s.cylinder(0.033, 0.033, 0.12, [0.1, 0.52, 0.05], s.material('#c8302c', { metalness: 0.6 }), 10));
      g.position.set(cx, 0.06, cz);
      g.rotation.y = mix(0.3, 1.0, random());
      s.root.add(g);
    }
    if (mood.density > 0.45) {
      const bx = hw + 0.5, bz = -0.3;
      const bale = s.box([0.45, 0.4, 0.95], [bx, 0.26, bz], s.material('#cfa94a', { roughness: 1 }));
      bale.rotation.y = (random() - 0.5) * 0.4;
      for (const z of [-0.25, 0.25]) s.box([0.46, 0.41, 0.015], [bx, 0.26, bz + z], s.material('#c8502c')).rotation.y = bale.rotation.y;
      s.rod([bx + 0.1, 0.46, bz + 0.2], [bx + 0.25, 1.55, bz - 0.25], 0.015, s.material('#b08d57'));
      for (const k of [-1, 0, 1]) s.rod([bx + 0.1 + k * 0.05, 0.46, bz + 0.2], [bx + 0.07 + k * 0.06, 0.2, bz + 0.3], 0.006, steel);
    }

    const speed = mix(4, 22, mood.energy);
    return s.finish({ update: blades ? (dt) => { blades!.rotation.z += dt * speed; } : undefined });
  },
});
