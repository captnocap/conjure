import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { Sculpture, choice, defineThing, mix } from '@conjure/kit';
import { pick, tone } from './lib';

type V = readonly [number, number, number];
const bar = (from: V, to: V, radius: number) => {
  const a = new THREE.Vector3(...from), b = new THREE.Vector3(...to), d = b.clone().sub(a);
  const g = new THREE.CylinderGeometry(radius, radius, d.length(), 6);
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.clone().normalize()));
  g.translate(...(a.add(b).multiplyScalar(0.5).toArray() as [number, number, number]));
  return g;
};
const slab = (size: V, at: V, tiltX = 0) => { const g = new THREE.BoxGeometry(...size); g.rotateX(tiltX); g.translate(...at); return g; };

export default defineThing({
  questions: {
    arrangement: choice('How are the chairs arranged?', {
      rows: 'Set out in straight rows with a centre aisle, all facing one way toward the front.',
      circle: 'Pulled into a circle facing each other, for a meeting where people take turns talking.',
      rack: 'Folded and stacked upright on a rolling steel rack, put away or not yet put out.',
      graveside: 'Two short rows on the grass under draped covers, facing an empty rectangle.',
      aftermath: 'Left where people stood up: pushed back, turned to each other, a few folded and leaned in a pile.',
    }),
    apart: choice('There is one chair set apart from the rest. How?', {
      'facing-away': 'Off to one side with its back to the others.',
      'up-front': 'Alone at the front, facing everyone.',
      tipped: 'Knocked over on its side and left there.',
      reserved: 'Kept empty on purpose: a ribbon across it and flowers on the seat.',
      'back-row': 'Dragged far behind the last row, as close to the door as it can get.',
      none: 'None: every chair belongs to the group.',
    }),
    make: choice('What kind of folding chairs are they?', {
      'beige-steel': 'Beige all-steel chairs with a stamped back, cold to sit on.',
      'brown-padded': 'Dark brown frames with cracked padded vinyl seats.',
      'grey-plastic': 'Grey plastic seats on silver frames, light and new.',
      'white-wood': 'White wooden slat chairs, the kind rented for weddings.',
      mismatched: 'A mix gathered from three closets: beige, brown, blue and one green.',
    }),
    front: choice('If the chairs face something, what is it?', {
      lectern: 'A wooden lectern with a slanted top.',
      'music-stand': 'A music stand and a microphone on a boom.',
      'coffee-table': 'A small table with a coffee urn, cups and a box of tissues.',
      candle: 'A single candle in a jar on a stool.',
      nothing: 'Nothing: bare floor.',
    }),
    left: choice('What has been left on the chairs?', {
      hymnals: 'Hymnals and Bibles on some of the seats.',
      programmes: 'Folded paper programmes, one on every seat.',
      coats: 'Coats over the backs and a purse or two underneath.',
      cups: 'Paper cups on the floor under the seats.',
      nothing: 'Nothing at all.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const wear = mood.wear;
    const mess = mix(0.02, 0.22, mood.energy) + (a.arrangement === 'aftermath' ? 0.5 : 0);

    // ---- Chair geometry: frame and panels, open and folded
    const wood = a.make === 'white-wood';
    const padded = a.make === 'brown-padded';
    const r = wood ? 0.016 : 0.011;
    const openFrame = mergeGeometries([
      ...[-0.2, 0.2].flatMap((x) => [bar([x, 0, 0.2], [x, 0.84, -0.26], r), bar([x, 0, -0.27], [x, 0.44, 0.16], r)]),
      bar([-0.2, 0.15, -0.14], [0.2, 0.15, -0.14], r * 0.8), bar([-0.2, 0.12, 0.134], [0.2, 0.12, 0.134], r * 0.8), bar([-0.2, 0.84, -0.26], [0.2, 0.84, -0.26], r),
    ])!;
    const openPanels = mergeGeometries(wood
      ? [...[0, 1, 2, 3, 4].map((i) => slab([0.4, 0.018, 0.06], [0, 0.445, -0.14 + i * 0.075])), slab([0.4, 0.07, 0.018], [0, 0.76, -0.215], 0.5), slab([0.4, 0.07, 0.018], [0, 0.65, -0.155], 0.5)]
      : [slab([0.4, padded ? 0.05 : 0.02, 0.38], [0, padded ? 0.46 : 0.445, -0.02]), slab([0.41, padded ? 0.2 : 0.16, padded ? 0.035 : 0.015], [0, 0.72, -0.195], 0.5)])!;
    const foldFrame = mergeGeometries([...[-0.2, 0.2].flatMap((x) => [bar([x, 0, 0], [x, 0.96, 0], r), bar([x, 0.04, 0.02], [x, 0.62, 0.02], r)]), bar([-0.2, 0.96, 0], [0.2, 0.96, 0], r), bar([-0.2, 0.1, 0.02], [0.2, 0.1, 0.02], r * 0.8)])!;
    const foldPanels = mergeGeometries([slab([0.4, 0.38, padded ? 0.04 : 0.02], [0, 0.4, 0.012]), slab([0.41, 0.17, 0.016], [0, 0.82, 0])])!;

    const frameHex = { 'beige-steel': '#b9ad94', 'brown-padded': '#4a3a2e', 'grey-plastic': '#b8bcc0', 'white-wood': '#f1eee4', mismatched: '#8a8478' }[a.make];
    const panelPalette = { 'beige-steel': ['#b9ad94', '#b3a78e', '#c0b49c'], 'brown-padded': ['#7a4a2a', '#6f4326', '#84522e'], 'grey-plastic': ['#9aa0a6', '#a2a8ae'], 'white-wood': ['#f4f1e6', '#ece8da'], mismatched: ['#b9ad94', '#7a4a2a', '#3a5f8a', '#3a5f8a', '#b9ad94', '#4f7a4a', '#8a2a2a'] }[a.make];
    const frameMat = s.material(frameHex, { metalness: wood ? 0 : 0.35, roughness: 0.5 });
    const panelMat = s.material('#ffffff', { roughness: padded ? 0.45 : 0.6, metalness: a.make === 'beige-steel' ? 0.25 : 0 });

    type Seat = { x: number; z: number; turn: number; tipZ?: number; folded?: boolean; lean?: number; y?: number; cover?: boolean; lone?: boolean };
    const seats: Seat[] = [];
    const jitter = (amount: number) => (random() - 0.5) * amount;
    let frontAt: V = [0, 0, -1.6];
    let rackLength = 0;
    let bounds = { minX: -1, maxX: 1, minZ: -1, maxZ: 1 };

    if (a.arrangement === 'rows') {
      const rows = Math.round(mix(2, 5, mood.density)), half = Math.round(mix(2, 4, mood.density));
      for (let row = 0; row < rows; row++) for (const sign of [-1, 1]) for (let c = 0; c < half; c++)
        seats.push({ x: sign * (0.45 + 0.25 + c * 0.52) + jitter(mess * 0.3), z: -0.2 + row * 0.9 + jitter(mess * 0.3), turn: Math.PI + jitter(mess * 1.5) });
      frontAt = [0, 0, -1.9];
      bounds = { minX: -(0.7 + half * 0.52), maxX: 0.7 + half * 0.52, minZ: -0.5, maxZ: -0.2 + (rows - 1) * 0.9 + 0.3 };
    } else if (a.arrangement === 'circle') {
      const n = Math.round(mix(6, 14, mood.density));
      const radius = Math.max(1.1, n * 0.62 / (Math.PI * 2));
      for (let i = 0; i < n; i++) {
        const angle = (i + 0.5) / n * Math.PI * 2;
        seats.push({ x: Math.sin(angle) * (radius + jitter(mess)), z: Math.cos(angle) * (radius + jitter(mess)), turn: angle + Math.PI + jitter(mess * 1.5) });
      }
      frontAt = [0, 0, 0];
      bounds = { minX: -radius - 0.3, maxX: radius + 0.3, minZ: -radius - 0.3, maxZ: radius + 0.3 };
    } else if (a.arrangement === 'rack') {
      const n = Math.round(mix(10, 34, mood.density));
      rackLength = n * 0.06 + 0.3;
      const gaps = wear > 0.5 ? 0.2 : 0.06;
      for (let i = 0; i < n; i++) if (random() > gaps) seats.push({ x: -rackLength / 2 + 0.2 + i * 0.06, z: 0, turn: Math.PI / 2, folded: true, lean: -0.12 + jitter(0.03), y: 0.22 });
      const out = Math.round(mix(0, 3, random()));
      for (let i = 0; i < out; i++) seats.push({ x: rackLength / 2 + 0.6 + i * 0.12, z: 0.55 + i * 0.03, turn: 0.2 + jitter(0.1), folded: true, lean: -0.28 - i * 0.02, y: 0 });
      bounds = { minX: -rackLength / 2, maxX: rackLength / 2, minZ: -0.4, maxZ: 0.5 };
    } else if (a.arrangement === 'graveside') {
      const per = Math.round(mix(3, 6, mood.density));
      for (let row = 0; row < 2; row++) for (let c = 0; c < per; c++) seats.push({ x: (c - (per - 1) / 2) * 0.5, z: 0.6 + row * 0.85, turn: Math.PI + jitter(0.05), cover: true });
      frontAt = [0, 0, -1.1];
      bounds = { minX: -per * 0.25 - 0.2, maxX: per * 0.25 + 0.2, minZ: 0.3, maxZ: 1.75 };
    } else {
      const n = Math.round(mix(7, 16, mood.density));
      for (let i = 0; i < n; i++) {
        const angle = random() * Math.PI * 2, d = 0.5 + random() * 2.0;
        const pair = i % 3 === 0;
        seats.push({ x: Math.sin(angle) * d, z: Math.cos(angle) * d * 0.8, turn: pair ? angle + Math.PI / 2 : random() * Math.PI * 2 });
        if (pair) seats.push({ x: Math.sin(angle) * d + Math.cos(angle) * 0.7, z: Math.cos(angle) * d * 0.8 - Math.sin(angle) * 0.7, turn: angle - Math.PI / 2 + jitter(0.4) });
      }
      for (let i = 0; i < 4; i++) seats.push({ x: -2.6 - i * 0.07, z: -0.8 + i * 0.02, turn: Math.PI / 2 + jitter(0.06), folded: true, lean: -0.3 - i * 0.03, y: 0 });
      frontAt = [0, 0, -2.4];
      bounds = { minX: -2.6, maxX: 2.5, minZ: -2, maxZ: 2 };
    }

    // ---- The one set apart
    let lone: Seat | null = null;
    if (a.apart === 'facing-away') lone = { x: bounds.maxX + 1.0, z: bounds.maxZ * 0.4 + 0.3, turn: a.arrangement === 'circle' ? Math.PI / 2 : 0.25 };
    else if (a.apart === 'up-front') lone = a.arrangement === 'circle' ? { x: 0, z: 0, turn: 0 } : { x: 0.95, z: frontAt[2] + (a.arrangement === 'rack' ? 1.4 : 0.1), turn: 0 };
    else if (a.apart === 'tipped') lone = { x: bounds.maxX + 0.8, z: bounds.minZ + 0.6, turn: 0.6 + jitter(1), tipZ: Math.PI / 2 };
    else if (a.apart === 'reserved') {
      if (a.arrangement === 'rack') lone = { x: bounds.maxX + 0.9, z: 0.5, turn: -0.3 };
      else { lone = seats.find((seat) => !seat.folded) ?? null; }
    } else if (a.apart === 'back-row') lone = { x: bounds.minX + 0.4 + random() * 0.5, z: bounds.maxZ + 1.5, turn: Math.PI + jitter(0.3) };
    if (lone && !seats.includes(lone)) seats.push(lone);
    if (lone) lone.lone = true;

    // ---- Instance them
    const place = (geometry: THREE.BufferGeometry, material: THREE.Material, list: Seat[], colour: (seat: Seat, i: number) => string) => {
      if (!list.length) return;
      const mesh = new THREE.InstancedMesh(geometry, material, list.length);
      const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
      list.forEach((seat, i) => {
        e.set(seat.lean ?? 0, seat.turn, seat.tipZ ?? 0, 'YXZ'); q.setFromEuler(e);
        m.compose(new THREE.Vector3(seat.x, (seat.y ?? 0) + (seat.tipZ ? 0.21 : 0), seat.z), q, new THREE.Vector3(1, 1, 1));
        mesh.setMatrixAt(i, m);
        mesh.setColorAt(i, new THREE.Color(colour(seat, i)));
      });
      mesh.castShadow = mesh.receiveShadow = true;
      s.root.add(mesh);
    };
    const open = seats.filter((seat) => !seat.folded), folded = seats.filter((seat) => seat.folded);
    const rusty = () => (random() < wear * 0.5 ? '#8a6a4a' : '#ffffff');
    const panelColour = () => { const c = pick(random, panelPalette); return random() < wear * 0.4 ? tone(c, -0.1) : c; };
    place(openFrame, frameMat, open, rusty);
    place(openPanels, panelMat, open, panelColour);
    place(foldFrame, frameMat, folded, rusty);
    place(foldPanels, panelMat, folded, panelColour);

    // ---- Graveside covers and the rectangle they face
    if (a.arrangement === 'graveside') {
      const velvet = s.material(pick(random, ['#2f5a3a', '#3a2f5a', '#5a2a2a']), { roughness: 1 });
      for (const seat of open.filter((x) => x.cover)) {
        s.box([0.44, 0.03, 0.42], [seat.x, 0.47, seat.z + 0.02], velvet);
        const back = s.box([0.45, 0.42, 0.03], [seat.x, 0.68, seat.z + 0.22], velvet); back.rotation.x = 0.5;
        s.box([0.44, 0.3, 0.02], [seat.x, 0.31, seat.z - 0.18], velvet);
      }
      s.box([2.4, 0.03, 1.1], [0, 0.015, -0.9], s.material('#3f7a3a', { roughness: 1 }));
      for (const x of [-1.25, 1.25]) s.rod([x, 0.08, -1.5], [x, 0.08, -0.3], 0.03, s.material('#c9cdd0', { metalness: 0.5, roughness: 0.3 }));
      for (const z of [-1.5, -0.3]) s.rod([-1.25, 0.08, z], [1.25, 0.08, z], 0.03, s.material('#c9cdd0', { metalness: 0.5, roughness: 0.3 }));
    }

    // ---- Rack
    if (a.arrangement === 'rack') {
      const steel = s.material('#6a7076', { metalness: 0.45, roughness: 0.45 });
      const L = rackLength;
      s.box([L, 0.04, 0.5], [0, 0.2, 0], steel);
      for (const x of [-L / 2, L / 2]) {
        s.rod([x, 0.2, -0.24], [x, 1.25, -0.24], 0.018, steel);
        s.rod([x, 0.2, 0.24], [x, 1.25, 0.24], 0.018, steel);
        s.rod([x, 1.25, -0.24], [x, 1.25, 0.24], 0.018, steel);
        for (const z of [-0.2, 0.2]) { const wheel = s.cylinder(0.07, 0.07, 0.04, [x * 0.9, 0.07, z], s.material('#1c1c1e'), 12); wheel.rotation.x = Math.PI / 2; wheel.rotation.z = random(); s.box([0.05, 0.08, 0.05], [x * 0.9, 0.15, z], steel); }
      }
      for (const z of [-0.24, 0.24]) s.rod([-L / 2, 0.75, z], [L / 2, 0.75, z], 0.014, steel);
    }

    // ---- What they face
    const [fx, , fz] = frontAt;
    const facing = a.arrangement === 'rows' || a.arrangement === 'aftermath' || (a.arrangement === 'circle' && a.apart !== 'up-front');
    if (facing && a.front !== 'nothing') {
      const centre = a.arrangement === 'circle';
      const kind = centre && (a.front === 'lectern' || a.front === 'music-stand') ? 'candle' : a.front;
      if (kind === 'lectern') {
        const oak = s.material('#7a5230', { roughness: 0.6 });
        s.box([0.6, 0.06, 0.5], [fx, 0.03, fz], oak);
        s.box([0.44, 1.02, 0.34], [fx, 0.57, fz], oak);
        const top = s.box([0.62, 0.04, 0.48], [fx, 1.13, fz], oak); top.rotation.x = 0.28;
        s.box([0.07, 0.4, 0.02], [fx, 0.68, fz + 0.18], s.material('#d9b84a', { metalness: 0.4 }));
        s.box([0.24, 0.07, 0.02], [fx, 0.76, fz + 0.18], s.material('#d9b84a', { metalness: 0.4 }));
      } else if (kind === 'music-stand') {
        const black = s.material('#1c1c1e', { metalness: 0.3 });
        s.rod([fx - 0.5, 0, fz], [fx - 0.5, 1.05, fz], 0.012, black);
        for (let i = 0; i < 3; i++) s.rod([fx - 0.5, 0.25, fz], [fx - 0.5 + Math.cos(i * 2.1) * 0.25, 0, fz + Math.sin(i * 2.1) * 0.25], 0.01, black);
        s.box([0.46, 0.32, 0.015], [fx - 0.5, 1.15, fz], black).rotation.x = -0.3;
        s.box([0.2, 0.28, 0.005], [fx - 0.52, 1.17, fz + 0.012], s.material('#f4f1e6')).rotation.x = -0.3;
        s.rod([fx + 0.4, 0, fz], [fx + 0.4, 1.3, fz], 0.012, black);
        s.cylinder(0.13, 0.14, 0.03, [fx + 0.4, 0.015, fz], black, 14);
        s.rod([fx + 0.4, 1.3, fz], [fx + 0.15, 1.5, fz + 0.3], 0.01, black);
        s.ball([0.03, 0.03, 0.045], [fx + 0.13, 1.51, fz + 0.33], s.material('#9aa0a2', { metalness: 0.5 }), 8);
      } else if (kind === 'coffee-table') {
        const x = centre ? fx : fx + 0.1;
        s.box([0.9, 0.03, 0.5], [x, 0.7, fz], s.material('#a37448'));
        for (const dx of [-0.4, 0.4]) for (const dz of [-0.2, 0.2]) s.rod([x + dx, 0, fz + dz], [x + dx, 0.7, fz + dz], 0.014, s.material('#8f9494', { metalness: 0.4 }));
        s.cylinder(0.11, 0.11, 0.34, [x - 0.25, 0.9, fz], s.material('#d5d9dc', { metalness: 0.45, roughness: 0.25 }), 16);
        s.cylinder(0.12, 0.12, 0.05, [x - 0.25, 0.735, fz], s.material('#1c1c1e'), 16);
        for (let i = 0; i < 8; i++) s.cylinder(0.035, 0.028, 0.08, [x + 0.05, 0.755 + i * 0.012, fz + 0.1], s.material('#f7f5ee'), 10);
        s.box([0.22, 0.09, 0.12], [x + 0.28, 0.76, fz - 0.05], s.material('#8fb7d4'));
        s.box([0.08, 0.05, 0.02], [x + 0.28, 0.82, fz - 0.05], s.material('#ffffff'));
      } else {
        s.cylinder(0.16, 0.16, 0.03, [fx, 0.46, fz], s.material('#7a5230'), 14);
        for (let i = 0; i < 3; i++) s.rod([fx + Math.cos(i * 2.1) * 0.1, 0.45, fz + Math.sin(i * 2.1) * 0.1], [fx + Math.cos(i * 2.1) * 0.16, 0, fz + Math.sin(i * 2.1) * 0.16], 0.014, s.material('#7a5230'));
        s.cylinder(0.05, 0.05, 0.12, [fx, 0.535, fz], new THREE.MeshStandardMaterial({ color: '#f6e6c0', roughness: 0.2, emissive: '#ffb14a', emissiveIntensity: 0.6 }), 12);
        s.ball([0.014, 0.03, 0.014], [fx, 0.62, fz], s.material('#fff0b0', { emissive: '#ffb14a', emissiveIntensity: 2 }), 8);
      }
    }

    // ---- Reserved chair dressing
    if (a.apart === 'reserved' && lone) {
      const ribbon = s.material(mood.cheer > 0.55 ? '#f4f1e6' : '#2a2a2e', { roughness: 0.5 });
      const group = new THREE.Group();
      group.position.set(lone.x, 0, lone.z); group.rotation.y = lone.turn; s.root.add(group);
      const sash = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.07, 0.012), ribbon); sash.position.set(0, 0.62, -0.13); sash.rotation.z = 0.5; sash.castShadow = true;
      group.add(sash);
      const stems = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.035, 0.3, 8), s.material('#3f6a3a')); stems.position.set(0, 0.48, 0); stems.rotation.z = Math.PI / 2; group.add(stems);
      for (let i = 0; i < 5; i++) { const bloom = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), s.material(pick(random, mood.cheer > 0.5 ? ['#ffffff', '#f2a6b8', '#f4e04a'] : ['#f4f1e6', '#b3261e', '#e8e2d0']))); bloom.position.set(0.14 + random() * 0.07, 0.48 + random() * 0.04, jitter(0.1)); bloom.castShadow = true; group.add(bloom); }
    }

    // ---- What was left behind
    const sat = open.filter((seat) => !seat.tipZ && !seat.cover && !(a.apart === 'reserved' && seat.lone));
    const local = (seat: Seat, dx: number, dy: number, dz: number): V => [seat.x + Math.cos(seat.turn) * dx + Math.sin(seat.turn) * dz, dy, seat.z - Math.sin(seat.turn) * dx + Math.cos(seat.turn) * dz];
    if (a.left === 'hymnals') {
      s.scatter(new THREE.BoxGeometry(0.15, 0.035, 0.21), s.material('#ffffff'), sat.filter(() => random() < 0.55).map((seat) => ({ at: local(seat, jitter(0.1), 0.475, jitter(0.08)), size: 1, color: pick(random, ['#7a1f1f', '#1f3b6e', '#234a34', '#1c1a18']) })));
    } else if (a.left === 'programmes') {
      s.scatter(new THREE.BoxGeometry(0.14, 0.006, 0.2), s.material('#ffffff'), sat.filter(() => random() < 0.9).map((seat) => ({ at: local(seat, jitter(0.1), 0.462, jitter(0.08)), size: 1, color: pick(random, ['#f7f1dc', '#f4f1e6', '#e8dcc0']) })));
    } else if (a.left === 'coats') {
      for (const seat of sat.filter(() => random() < 0.45).slice(0, 9)) {
        const coat = s.box([0.46, 0.5, 0.06], local(seat, 0, 0.62, -0.26), s.material(pick(random, ['#3a3a4a', '#6a4a2a', '#7a1f2a', '#2a4a3a', '#b8a078', '#1c1c1e']), { roughness: 1 }));
        coat.rotation.set(0.42, seat.turn, 0, 'YXZ');
        if (random() < 0.5) s.box([0.24, 0.18, 0.1], local(seat, 0.1, 0.09, -0.02), s.material(pick(random, ['#1c1c1e', '#7a4a2a', '#8a2a3a']))).rotation.y = seat.turn;
      }
    } else if (a.left === 'cups') {
      s.scatter(new THREE.CylinderGeometry(0.035, 0.026, 0.09, 10), s.material('#ffffff'), sat.filter(() => random() < 0.6).map((seat) => ({ at: local(seat, jitter(0.3), 0.045, 0.1 + jitter(0.2)), size: 1, color: pick(random, ['#f7f5ee', '#f7f5ee', '#d8263c']) })));
    }

    return s.finish();
  },
});
