import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul, score } from '@conjure/kit';

type P3 = [number, number, number];

export default defineThing({
  questions: {
    height: score('How high is the pile?', ['A few plates, ankle high', 'Knee high', 'Waist high', 'Over head height']),
    order: choice('How are the plates arranged?', {
      sorted: 'Sorted by size into a row of square-edged stacks, largest to smallest.',
      single: 'One tall, careful stack of matching plates.',
      heaped: 'Dumped in a slumping heap, every plate at its own angle.',
      leaning: 'Leant like playing cards against a steel trestle, with a small stack beside.',
    }),
    fragment: choice('What recognisable fragment of the ship is on the plate propped at the front?', {
      letter: 'One huge white letter from the name on the bow.',
      porthole: 'A brass-rimmed porthole, glass still in it.',
      draught: 'Two or three draught numerals, one above the other.',
      bootline: 'The waterline: red bottom paint, a white stripe and topside colour.',
      emblem: 'A piece of the funnel emblem, half a star in a ring.',
      none: 'Nothing: it is only rusty steel with burnt edges.',
    }),
    paint: choice('What hull colour still clings to some of the plates?', {
      black: 'Black topside paint.',
      blue: 'Deep blue.',
      green: 'Bottle green.',
      red: 'Red anti-fouling from below the waterline.',
      white: 'Chalky white superstructure paint.',
      mixed: 'Every colour: plates from several ships together.',
    }),
    carry: choice('How are the plates being moved?', {
      hands: 'By hand: a line of men carrying one plate on their shoulders.',
      loader: 'By a battered yellow wheel loader with a plate on its forks.',
      nobody: 'They are not: a pair of gloves and a rope sling lie on top.',
    }),
    chalk: noul('Are thickness and lot numbers chalked on the top plates?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const T = 0.04;
    const HULL = { black: ['#23262b'], blue: ['#1f3f72'], green: ['#1f4a3a'], red: ['#8c3a2c'], white: ['#dedbd0'], mixed: ['#23262b', '#1f3f72', '#1f4a3a', '#8c3a2c', '#dedbd0', '#cf6a2a'] }[a.paint];
    const rusts = ['#6b4a3a', '#7a5238', '#5c4238', '#84573a', '#4f3d36'];
    const pick = <X,>(list: readonly X[]) => list[Math.floor(random() * list.length)];
    const tallest = mix(0.16, 2.1, a.height);
    const hull = HULL[0];

    const plates: { at: P3; size: P3; rot: P3; colour: string }[] = [];
    const tops: { x: number; y: number; z: number; w: number; d: number }[] = [];
    const colourOf = () => (random() < 0.3 ? pick(HULL) : pick(rusts));
    const stack = (x: number, z: number, w: number, d: number, h: number, sloppy: number) => {
      const n = Math.max(2, Math.round(h / T));
      const yaw = (random() - 0.5) * 0.12;
      for (let i = 0; i < n; i++) plates.push({ at: [x + (random() - 0.5) * sloppy, T / 2 + i * T, z + (random() - 0.5) * sloppy], size: [w * mix(0.94, 1, random()), T * 0.94, d * mix(0.94, 1, random())], rot: [0, yaw + (random() - 0.5) * sloppy * 0.5, 0], colour: colourOf() });
      tops.push({ x, y: n * T, z, w, d });
      return n * T;
    };
    let frontZ = 0.9, frontX = 0, frontY = 0;
    if (a.order === 'sorted') {
      const sizes: [number, number][] = [[2.6, 1.5], [2.0, 1.3], [1.5, 1.1], [1.1, 0.8], [0.8, 0.6]];
      const count = 3 + Math.floor(mood.density * 2.99);
      let x = -sizes.slice(0, count).reduce((sum, [w]) => sum + w + 0.25, 0) / 2;
      sizes.slice(0, count).forEach(([w, d], i) => { stack(x + w / 2, -d / 2 + 0.75, w, d, tallest * mix(1, 0.75, random()) * (i === 0 ? 1 : 0.9), 0.05); x += w + 0.25; });
      frontX = tops[0].x; frontZ = 0.75; frontY = tops[0].y;
    } else if (a.order === 'single') {
      stack(0, 0, 2.6, 1.5, tallest, 0.04);
      frontZ = 0.75; frontY = tallest;
    } else if (a.order === 'heaped') {
      const n = Math.round(mix(14, 150, a.height) * mix(0.8, 1.2, mood.density)), R = mix(1.4, 2.6, a.height);
      const peak = tallest * 1.15 + 0.2;
      for (let i = 0; i < n; i++) {
        const r = Math.sqrt(random()) * R, ang = random() * Math.PI * 2, layer = random();
        const surface = peak * Math.pow(Math.max(0, 1 - r / R), 1.2);
        const w = 0.8 + random() * 1.8;
        plates.push({ at: [Math.cos(ang) * r, T / 2 + surface * layer + (r > R * 0.7 ? 0.05 : 0.1), Math.sin(ang) * r], size: [w, T, w * (0.5 + random() * 0.3)], rot: [(random() - 0.5) * 0.5 + Math.sin(ang) * 0.25, random() * Math.PI, (random() - 0.5) * 0.5 - Math.cos(ang) * 0.25], colour: colourOf() });
      }
      frontZ = R * 0.55; frontY = peak * 0.35;
    } else {
      const lean = 0.3, top = Math.max(1.0, tallest * 1.1 + 0.5);
      const steel = s.material('#4a4441', { metalness: 0.4 });
      for (const x of [-1.2, 1.2]) { s.rod([x, 0, -0.7], [x, top, 0], 0.05, steel); s.rod([x, 0, 0.7], [x, top, 0], 0.05, steel); }
      s.rod([-1.4, top, 0], [1.4, top, 0], 0.05, steel);
      const n = Math.round(mix(3, 14, a.height));
      for (const side of [1, -1]) for (let i = 0; i < n; i++) {
        const h = top * mix(0.95, 1.25, random()), w = 1.4 + random() * 1.2;
        const off = 0.06 + i * (T + 0.012);
        plates.push({ at: [(random() - 0.5) * 0.8, (h / 2) * Math.cos(lean), side * (off / Math.cos(lean) + (top * 0.92 - (h / 2)) * Math.sin(lean) + 0.38 * (top / 1.5))], size: [w, h, T], rot: [-side * lean, 0, (random() - 0.5) * 0.03], colour: colourOf() });
      }
      stack(2.6, 0, 1.2, 0.9, Math.max(0.12, tallest * 0.4), 0.06);
      frontZ = 0.7 + n * 0.08 + top * 0.3; frontX = -0.2; frontY = 0;
    }
    const extentX = Math.max(...plates.map((p) => Math.abs(p.at[0]) + p.size[0] / 2)), minZ = Math.min(...plates.map((p) => p.at[2] - 0.6));
    // Offcuts on the ground.
    for (let i = 0; i < 3 + Math.floor(mood.density * 8); i++) {
      const ang = random() * Math.PI * 2, r = extentX * 0.6 + 0.9 + random() * 0.8;
      plates.push({ at: [Math.cos(ang) * r * 1.25, T / 2, Math.abs(Math.sin(ang)) * r * 0.9 + 0.5], size: [0.3 + random() * 0.6, T, 0.2 + random() * 0.4], rot: [0, random() * 3, 0], colour: colourOf() });
    }
    const edge = new THREE.MeshStandardMaterial({ color: '#3a3330', roughness: 0.95 });
    const face = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: mix(0.7, 0.95, mood.wear), metalness: 0.2 });
    const thin = (size: P3) => (size[1] <= size[2] ? [edge, edge, face, face, edge, edge] : [edge, edge, edge, edge, face, face]);
    for (const flat of [true, false]) {
      const group = plates.filter((p) => (p.size[1] <= p.size[2]) === flat);
      if (!group.length) continue;
      const mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), thin(group[0].size), group.length);
      const m = new THREE.Matrix4(), q = new THREE.Quaternion();
      group.forEach((p, i) => {
        q.setFromEuler(new THREE.Euler(...p.rot));
        mesh.setMatrixAt(i, m.compose(new THREE.Vector3(...p.at), q, new THREE.Vector3(...p.size)));
        mesh.setColorAt(i, new THREE.Color(p.colour));
      });
      mesh.castShadow = mesh.receiveShadow = true;
      s.root.add(mesh);
    }

    // The propped plate that still says what it was.
    {
      const w = 2.1 + random() * 0.5, h = 1.45 + random() * 0.3;
      const canvas = document.createElement('canvas');
      canvas.width = 512; canvas.height = Math.round((512 * h) / w);
      const ctx = canvas.getContext('2d')!, W = 512, Hh = canvas.height;
      const plain = a.fragment === 'none';
      ctx.fillStyle = plain ? '#6b4a3a' : a.fragment === 'emblem' ? '#d8b23a' : hull;
      ctx.fillRect(0, 0, W, Hh);
      const ink = a.paint === 'white' ? '#1e2c44' : '#ece8dc';
      ctx.fillStyle = ink; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      if (a.fragment === 'letter') {
        const word = pick(['OCEAN PROMISE', 'STELLA MARIS', 'GOLDEN HARVEST', 'NORTHERN STAR']);
        const i = 1 + Math.floor(random() * (word.length - 3));
        ctx.font = `bold ${Hh * 0.82}px sans-serif`;
        ctx.fillText(word.slice(i - 1, i + 2).replace(' ', '  '), W * (0.35 + random() * 0.3), Hh * 0.52);
      } else if (a.fragment === 'draught') {
        const first = 4 + Math.floor(random() * 6) * 2;
        ctx.font = `bold ${Hh * 0.3}px sans-serif`;
        [0, 1, 2].forEach((k) => { ctx.fillText(String(first - k * 2), W * 0.42, Hh * (0.18 + k * 0.33)); ctx.fillRect(W * 0.6, Hh * (0.3 + k * 0.33), W * 0.16, Hh * 0.025); });
      } else if (a.fragment === 'bootline') {
        ctx.fillStyle = '#8c3a2c'; ctx.fillRect(0, Hh * 0.55, W, Hh);
        ctx.fillStyle = '#e8e4d8'; ctx.fillRect(0, Hh * 0.47, W, Hh * 0.09);
        ctx.fillStyle = 'rgba(120,128,92,0.5)';
        for (let i = 0; i < 40; i++) ctx.fillRect(random() * W, Hh * (0.6 + random() * 0.4), 20 + random() * 60, 6 + random() * 10);
      } else if (a.fragment === 'emblem') {
        ctx.strokeStyle = '#1f3f72'; ctx.lineWidth = Hh * 0.09;
        ctx.beginPath(); ctx.arc(W * 0.78, Hh * 0.55, Hh * 0.62, 0, 7); ctx.stroke();
        ctx.fillStyle = '#b3261f'; ctx.beginPath();
        for (let k = 0; k < 10; k++) { const r = Hh * (k % 2 ? 0.2 : 0.48), t = (k * Math.PI) / 5 - Math.PI / 2; ctx.lineTo(W * 0.78 + Math.cos(t) * r, Hh * 0.55 + Math.sin(t) * r); }
        ctx.fill();
      } else if (a.fragment === 'porthole') {
        ctx.strokeStyle = 'rgba(0,0,0,0.3)'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(0, Hh * 0.2); ctx.lineTo(W, Hh * 0.2); ctx.stroke();
      }
      for (let i = 0; i < 10 + mood.wear * 40; i++) {
        const x = random() * W, y = random() * Hh, len = 30 + random() * 120, g = ctx.createLinearGradient(0, y, 0, y + len);
        g.addColorStop(0, 'rgba(125,62,30,0.6)'); g.addColorStop(1, 'rgba(125,62,30,0)');
        ctx.fillStyle = g; ctx.fillRect(x, y, 4 + random() * 14, len);
      }
      const burn = ctx.createRadialGradient(W / 2, Hh / 2, Hh * 0.42, W / 2, Hh / 2, W * 0.62);
      burn.addColorStop(0, 'rgba(20,16,14,0)'); burn.addColorStop(1, 'rgba(20,16,14,0.85)');
      ctx.fillStyle = burn; ctx.fillRect(0, 0, W, Hh);
      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.repeat.set(1 / w, 1 / h);
      const corners: [number, number][] = [[0, 0.04 * random()], [w * 0.5, 0], [w, 0.1 * random()], [w - 0.15 * random(), h * 0.55], [w - 0.3 * random(), h], [w * 0.45, h - 0.12 * random()], [0.25 * random(), h - 0.2 * random()], [0.1 * random(), h * 0.5]];
      const shape = new THREE.Shape(corners.map(([x, y]) => new THREE.Vector2(x, y)));
      const geometry = new THREE.ExtrudeGeometry(shape, { depth: T, bevelEnabled: false });
      geometry.translate(-w / 2, 0, 0);
      const plate = new THREE.Mesh(geometry, [new THREE.MeshStandardMaterial({ map: texture, roughness: 0.85 }), edge]);
      plate.castShadow = plate.receiveShadow = true;
      s.root.add(plate);
      const lean = a.order === 'heaped' ? 0.75 : a.order === 'leaning' ? 0.32 : frontY < h * 0.5 ? Math.PI / 2 - Math.asin(Math.min(0.95, Math.max(0.08, frontY) / h)) : 0.22;
      plate.rotation.set(-lean, (random() - 0.5) * 0.2, (random() - 0.5) * 0.06);
      plate.position.set(frontX + (random() - 0.5) * 0.3, a.order === 'heaped' ? frontY * 0.5 : 0, frontZ + 0.06 + Math.sin(lean) * h * (a.order === 'heaped' ? 0.3 : 1) * (lean > 0.5 && a.order !== 'heaped' ? 1 : 0.3));
      if (a.fragment === 'porthole') {
        const port = new THREE.Group();
        const ring = new THREE.Mesh(new THREE.TorusGeometry(0.27, 0.05, 10, 28), s.material('#c79a3a', { metalness: 0.6, roughness: 0.35 }));
        const glass = new THREE.Mesh(new THREE.CircleGeometry(0.26, 24), new THREE.MeshStandardMaterial({ color: '#27404a', roughness: 0.1, metalness: 0.3 }));
        ring.castShadow = true;
        port.add(ring, glass);
        for (let k = 0; k < 6; k++) { const bolt = new THREE.Mesh(new THREE.SphereGeometry(0.025, 6, 5), ring.material); bolt.position.set(Math.cos(k * 1.047) * 0.34, Math.sin(k * 1.047) * 0.34, 0); port.add(bolt); }
        port.position.set(w * (random() * 0.3 - 0.15), h * 0.55, T + 0.012);
        plate.add(port);
      }
    }

    if (a.chalk) for (const top of tops) {
      const mark = s.label(pick(['20 MM', '16 MM', 'LOT 4', 'RE-ROLL', '12 MM', 'A-1']), Math.min(1.1, top.w * 0.7), Math.min(0.3, top.d * 0.3), [top.x, top.y + 0.006, top.z], '#f4f1e4', '#5c4238');
      mark.rotation.set(-Math.PI / 2, 0, (random() - 0.5) * 0.3);
      mark.castShadow = false;
    }

    const person = (x: number, z: number, turn: number, carrying: boolean) => {
      const skin = s.material('#7a5038'), cloth = s.material(pick(['#3d6fa3', '#b8452f', '#d9c36a', '#5a8f6b', '#e8e2d0']));
      s.box([0.28, 0.82, 0.22], [x, 0.41, z], s.material(pick(['#3b3f45', '#6b5a4a', '#9a8a6a']))).rotation.y = turn;
      s.box([0.4, 0.58, 0.24], [x, 1.11, z], cloth).rotation.y = turn;
      s.ball([0.11, 0.125, 0.115], [x, 1.52, z], skin, 10);
      if (carrying) { s.cylinder(0.12, 0.12, 0.05, [x, 1.65, z], s.material('#d8cfae', { roughness: 1 }), 10); s.rod([x + 0.2, 1.3, z], [x + 0.24, 1.72, z + 0.3], 0.04, skin); }
    };
    const far = a.order === 'sorted' ? 0 : a.order === 'heaped' ? 0 : 0;
    void far;
    const sideX = extentX + 0.9;
    if (a.carry === 'hands') {
      const men = 4 + Math.floor(mood.density * 2.5), gap = 0.62;
      const bx = 0, bz = minZ - 0.9;
      for (let i = 0; i < men; i++) person(bx + (i - (men - 1) / 2) * gap, bz + 0.2 + (i % 2) * 0.02, Math.PI / 2, true);
      const load = s.box([men * gap + 0.5, T, 1.0], [bx, 1.49, bz - 0.02], s.material(hull === '#dedbd0' ? '#b8b4a6' : hull));
      load.rotation.x = 0.1; load.position.y = 1.7; load.position.z = bz + 0.05;
    } else if (a.carry === 'loader') {
      const yellow = s.material('#d9a51e', { roughness: 0.6 }), tyre = s.material('#1b1b1c', { roughness: 1 }), dark = s.material('#2a2c30');
      const lx = sideX + 0.6, lz = -0.9;
      s.box([1.5, 0.9, 2.6], [lx, 1.05, lz - 0.5], yellow);
      s.box([1.3, 1.0, 1.1], [lx, 2.0, lz - 0.7], yellow);
      s.box([1.34, 0.6, 0.95], [lx, 2.1, lz - 0.7], s.material('#1c2a33', { roughness: 0.2 }));
      s.box([1.2, 0.6, 0.9], [lx, 1.45, lz + 0.5], dark);
      s.rod([lx + 0.5, 1.8, lz - 1.6], [lx + 0.5, 2.9, lz - 1.6], 0.05, dark);
      for (const dx of [-0.85, 0.85]) for (const dz of [-1.35, 0.45]) {
        s.cylinder(0.55, 0.55, 0.42, [lx + dx, 0.55, lz + dz], tyre, 18).rotation.z = Math.PI / 2;
        s.cylinder(0.25, 0.25, 0.44, [lx + dx, 0.55, lz + dz], yellow, 12).rotation.z = Math.PI / 2;
      }
      for (const dx of [-0.55, 0.55]) { s.rod([lx + dx, 1.5, lz + 0.6], [lx + dx, 0.75, lz + 2.2], 0.09, yellow); s.box([0.12, 0.07, 1.5], [lx + dx, 0.45, lz + 2.9], dark); }
      s.box([1.5, 0.9, 0.1], [lx, 0.85, lz + 2.2], dark);
      for (let i = 0; i < 3; i++) s.box([2.4 - i * 0.2, T, 1.3], [lx + (random() - 0.5) * 0.2, 0.51 + i * T, lz + 2.95], s.material(i === 1 ? hull : pick(rusts))).rotation.y = (random() - 0.5) * 0.15;
    } else if (tops.length) {
      const top = tops[tops.length > 1 ? 1 : 0];
      const leather = s.material('#b98a4e', { roughness: 1 });
      for (const dx of [0, 0.16]) s.box([0.11, 0.035, 0.26], [top.x - 0.2 + dx, top.y + 0.02, top.z + dx * 0.5], leather).rotation.y = 0.3 + dx * 2;
      s.ring(0.2, 0.018, [top.x + 0.25, top.y + 0.02, top.z - 0.05], s.material('#b89f6a', { roughness: 1 })).rotation.x = Math.PI / 2;
    }
    return s.finish();
  },
});
