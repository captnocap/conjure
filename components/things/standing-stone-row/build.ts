import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';

const ROCK = {
  granite: 'Coarse grey granite, speckled, with white and mustard lichen.',
  sandstone: 'Red-brown sandstone, layered and soft-edged.',
  schist: 'Dark blue-grey schist that splits into thin flaky blades.',
  quartz: 'Milk-white quartz that gleams even under cloud.',
} as const;

export default defineThing({
  questions: {
    count: choice('How many stones are in the row?', {
      three: 'Three: the smallest number that makes a line.',
      four: 'Four, unevenly spaced.',
      five: 'Five, a proper alignment.',
      many: 'A long row of eight or nine low stones, like teeth.',
    }),
    shape: choice('What shape are the stones?', {
      needles: 'Tall thin needles, twice the height of a person.',
      slabs: 'Broad flat blades set edge to edge along the line, tops slanted.',
      boulders: 'Squat rounded boulders, rolled here and set upright.',
      graded: 'Graded in height from a giant at one end down to a knee-high stub.',
    }),
    rock: choice('What stone are they?', ROCK),
    fallen: choice('What has happened to the row?', {
      flat: 'One stone lies full length where it fell, sinking into the ground.',
      leaning: 'One leans far over, a few centuries from falling.',
      broken: 'One has snapped: a stump stands, the rest lies in pieces.',
      whole: 'All still stand, against the odds.',
    }),
    peat: score('How far has the peat risen around them?', ['They stand clear on short turf', 'Knee deep in heather', 'Half swallowed: only the upper halves show']),
    mark: choice('What hints at what the row was for?', {
      none: 'Nothing. The purpose is gone.',
      outlier: 'A single small outlier stone stands apart, continuing the line toward the horizon.',
      quartz: 'A line of white quartz pebbles is laid along the ground from stone to stone.',
      cups: 'Cup-and-ring marks are pecked into the face of the tallest stone.',
      ogham: 'Ogham strokes are cut along the edge of one stone: a name.',
    }),
    visitors: choice('Who has been here lately?', {
      nobody: 'Nobody for a very long time.',
      offerings: 'Coins, ribbons and a bunch of flowers left at the foot of the tallest stone.',
      sheep: 'A sheep sheltering in the lee of the stones.',
      survey: 'Archaeologists: red-and-white ranging poles and a taut string line.',
      fence: 'A farmer: the stones are used as fence posts, wire running from one to the next.',
      candles: 'Someone at the solstice: stubs of candles and a lantern still burning.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const rr = (lo: number, hi: number) => lo + (hi - lo) * random();
    const C = (hex: string) => new THREE.Color(hex);

    // Stone skin: speckle and lichen painted once, shared by every stone.
    const rockColour = C({ granite: '#8f8f88', sandstone: '#9a5f47', schist: '#525b63', quartz: '#e3e1d8' }[a.rock]);
    rockColour.lerp(C('#a07a55'), (mood.warmth - 0.5) * 0.12);
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 256;
    const g = canvas.getContext('2d')!;
    g.fillStyle = `#${rockColour.getHexString()}`;
    g.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 900; i++) { g.fillStyle = `rgba(${random() < 0.5 ? '255,255,255' : '0,0,0'},${rr(0.04, 0.2)})`; g.fillRect(rr(0, 256), rr(0, 256), rr(1, 4), rr(1, 3)); }
    if (a.rock === 'sandstone' || a.rock === 'schist') for (let y = 0; y < 256; y += rr(6, 18)) { g.fillStyle = `rgba(0,0,0,${rr(0.08, 0.25)})`; g.fillRect(0, y, 256, rr(1, 3)); }
    const lichens = a.rock === 'quartz' ? ['#b9b79f', '#c9a23c', '#8f9a7a'] : ['#d8d8cc', '#d8d8cc', '#c9a23c', '#9aa57e', '#e6e4d8'];
    for (let i = 0; i < Math.round(mix(40, 120, mood.wear) * (a.rock === 'sandstone' ? 0.5 : 1)); i++) {
      g.fillStyle = lichens[Math.floor(random() * lichens.length)];
      g.globalAlpha = rr(0.35, 0.85);
      const x = rr(0, 256), y = rr(0, 256), r = rr(2, 10);
      for (let k = 0; k < 6; k++) { g.beginPath(); g.arc(x + rr(-r, r) * 0.6, y + rr(-r, r) * 0.6, r * rr(0.3, 0.7), 0, 6.3); g.fill(); }
    }
    g.globalAlpha = 1;
    // Damp dark foot where the peat stains the stone.
    const stain = g.createLinearGradient(0, 150, 0, 256);
    stain.addColorStop(0, 'rgba(30,24,18,0)');
    stain.addColorStop(1, 'rgba(30,24,18,0.75)');
    g.fillStyle = stain;
    g.fillRect(0, 150, 256, 106);
    const skin = new THREE.CanvasTexture(canvas);
    skin.colorSpace = THREE.SRGBColorSpace;
    const stoneMaterial = new THREE.MeshStandardMaterial({ map: skin, roughness: a.rock === 'quartz' ? 0.55 : 0.95, flatShading: a.rock === 'schist' });

    const boulder = a.shape === 'boulders';
    const makeBoulder = (w: number, h: number, d: number) => {
      const geometry = new THREE.IcosahedronGeometry(1, 3);
      const p = geometry.attributes.position;
      const ph = [rr(0, 6), rr(0, 6), rr(0, 6)];
      for (let i = 0; i < p.count; i++) {
        const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
        const k = 1 + 0.1 * Math.sin(x * 3.1 + ph[0]) * Math.sin(y * 2.7 + ph[1]) + 0.07 * Math.sin(z * 4.3 + ph[2] + y * 2);
        // Broad in the belly, narrower at the crown, cut off flat where it enters the ground.
        const t = Math.max(0, y * 0.5 + 0.5);
        const girth = 0.75 + 0.35 * Math.sin(Math.min(1, t * 1.25) * Math.PI) ** 0.6;
        p.setXYZ(i, x * k * girth * w / 2, Math.max(-0.75, y) * k * h * 0.57 + h * 0.43, z * k * girth * d / 2);
      }
      geometry.computeVertexNormals();
      const mesh = new THREE.Mesh(geometry, stoneMaterial);
      mesh.castShadow = mesh.receiveShadow = true;
      return mesh;
    };
    const makeStone = (w: number, h: number, d: number): THREE.Mesh => {
      if (boulder) return makeBoulder(w, h, d);
      const geometry = boulder ? new THREE.BoxGeometry(w, h, d, 5, 6, 4) : new THREE.BoxGeometry(w, h, d, 3, 6, 2);
      const p = geometry.attributes.position;
      const ph = [rr(0, 6), rr(0, 6), rr(0, 6), rr(0, 6)];
      const taper = boulder ? 0.35 : a.shape === 'needles' ? 0.6 : rr(0.2, 0.45);
      const slant = rr(-0.5, 0.5) * (a.shape === 'slabs' || a.shape === 'graded' ? 1 : 0.4), peak = a.shape === 'needles' ? rr(0.2, 0.6) : rr(0, 0.25);
      for (let i = 0; i < p.count; i++) {
        let x = p.getX(i), y = p.getY(i), z = p.getZ(i);
        const t = Math.min(1, Math.max(0, y / h + 0.5));
        if (boulder) {
          // Round the box toward an egg.
          const nx = x / (w / 2), ny = (t - 0.45) / 0.55, nz = z / (d / 2);
          const k = 1 / Math.max(1, Math.hypot(nx, ny, nz) * 0.82);
          x *= k; z *= k; y = (ny * k * 0.55 + 0.45 - 0.5) * h;
        }
        x *= (1 - taper * t ** 1.6) * (1 + 0.1 * Math.sin(y * 3.1 + ph[0]) + 0.05 * Math.sin(y * 7 + ph[1]));
        z *= (1 - taper * 0.6 * t) * (1 + 0.12 * Math.sin(y * 2.3 + ph[2]));
        x += 0.05 * w * Math.sin(y * 1.7 + ph[3]);
        if (t > 0.6) y += ((t - 0.6) / 0.4) ** 2 * (slant * x - peak * Math.abs(x));
        p.setXYZ(i, x, y + h / 2, z);
      }
      geometry.computeVertexNormals();
      const mesh = new THREE.Mesh(geometry, stoneMaterial);
      mesh.castShadow = mesh.receiveShadow = true;
      return mesh;
    };

    const n = { three: 3, four: 4, five: 5, many: 8 + Math.floor(random() * 2) }[a.count];
    const small = a.count === 'many' ? 0.5 : 1;
    const gap = (a.count === 'many' ? 0.95 : a.shape === 'slabs' ? 1.75 : 1.55) * rr(0.92, 1.08);
    const bury = mix(0.03, 1.0, a.peat) * (a.count === 'many' ? 0.55 : 1);
    const length = (n - 1) * gap;
    const A = length / 2 + 1.25, B = 1.45;
    const surface = (x: number, z: number) => bury * Math.sqrt(Math.max(0, 1 - (x / A) ** 2 - (z / B) ** 2)) ** 0.7;
    const curve = rr(-0.25, 0.25);
    const victim = a.fallen === 'whole' ? -1 : 1 + Math.floor(random() * Math.max(1, n - 2));
    const stones: { x: number; z: number; w: number; h: number; d: number; group: THREE.Group; standing: boolean }[] = [];
    for (let i = 0; i < n; i++) {
      const t = n === 1 ? 0 : i / (n - 1);
      const x = -length / 2 + i * gap + rr(-0.15, 0.15), z = curve * Math.sin(t * Math.PI) + rr(-0.12, 0.12);
      let h = { needles: rr(2.3, 3.1), slabs: rr(1.5, 2.2), boulders: rr(1.0, 1.5), graded: mix(2.9, 0.9, t) }[a.shape] * small;
      const w = { needles: rr(0.42, 0.6), slabs: rr(0.95, 1.3), boulders: rr(0.85, 1.15), graded: mix(0.95, 0.55, t) }[a.shape] * (a.count === 'many' ? 0.6 : 1);
      const d = { needles: rr(0.32, 0.45), slabs: rr(0.26, 0.38), boulders: rr(0.7, 0.9), graded: rr(0.35, 0.5) }[a.shape] * (a.count === 'many' ? 0.7 : 1);
      const group = new THREE.Group();
      s.root.add(group);
      let standing = true;
      const ground = surface(x, z);
      if (i === victim && a.fallen === 'flat') {
        const stone = makeStone(w, h, d);
        stone.rotation.x = Math.PI / 2 - rr(0.02, 0.1);
        stone.position.set(0, 0, 0);
        group.add(stone);
        group.position.set(x, ground + d * 0.12, z + 0.25);
        group.rotation.y = rr(-0.35, 0.35);
        // The socket it left.
        const hole = s.cylinder(w * 0.5, w * 0.55, 0.04, [x, ground + 0.015, z - 0.05], s.material('#1c1714', { roughness: 0.4 }), 12);
        hole.castShadow = false;
        standing = false;
      } else if (i === victim && a.fallen === 'broken') {
        const stump = makeStone(w, h * 0.3 + bury, d);
        group.add(stump);
        group.position.set(x, 0, z);
        for (let k = 0; k < 3; k++) {
          const piece = makeStone(w * rr(0.6, 0.9), h * rr(0.18, 0.34), d * rr(0.8, 1));
          piece.rotation.set(Math.PI / 2 + rr(-0.2, 0.2), 0, rr(-0.4, 0.4));
          const px = x + rr(-0.4, 0.4), pz = z + 0.55 + k * 0.5;
          piece.position.set(px, surface(px, pz) + 0.05, pz);
          piece.rotation.order = 'YXZ';
          piece.rotation.y = rr(-0.8, 0.8);
          s.root.add(piece);
        }
        h = h * 0.3 + bury;
        standing = false;
      } else {
        group.add(makeStone(w, h, d));
        group.position.set(x, 0, z);
        const leanBase = mix(0.02, 0.14, mood.wear);
        group.rotation.set(rr(-leanBase, leanBase), rr(-0.3, 0.3), rr(-leanBase, leanBase));
        if (i === victim && a.fallen === 'leaning') { group.rotation.z = (random() < 0.5 ? -1 : 1) * rr(0.5, 0.68); group.position.y = ground * 0.6; standing = false; }
      }
      stones.push({ x, z, w, h, d, group, standing });
    }
    const upright = stones.filter((st) => st.standing);
    const tallest = upright.reduce((m, st) => (st.h > m.h ? st : m), upright[0] ?? stones[0]);

    // The peat that is swallowing them.
    const heath = C('#4d4a2c').lerp(C('#5e3848'), mood.cheer * 0.55);
    const mound = s.ball([A, Math.max(bury, 0.04), B], [0, 0, 0], new THREE.MeshStandardMaterial({ color: heath, roughness: 1 }), 28);
    mound.castShadow = false;
    const pad = s.cylinder(1, 1, 0.03, [0, 0.012, 0], new THREE.MeshStandardMaterial({ color: heath.clone().multiplyScalar(0.9), roughness: 1 }), 32);
    pad.scale.set(A, 1, B);
    pad.castShadow = false;
    const palette = ['#5e4229', '#5c2f3c', '#4c5527', '#73582f', '#43342a', mood.cheer > 0.6 ? '#8a4a70' : '#522b38', '#6d7a35'];
    const tuftCount = Math.round(mix(60, 160, mood.density) * mix(0.5, 1.2, a.peat));
    s.scatter(new THREE.IcosahedronGeometry(1, 0), new THREE.MeshStandardMaterial({ roughness: 1, flatShading: true }), Array.from({ length: tuftCount }, () => {
      const th = random() * 6.28, k = Math.sqrt(random()) * 0.97;
      const x = Math.cos(th) * k * A, z = Math.sin(th) * k * B;
      return { at: [x, surface(x, z) + 0.03, z] as const, size: rr(0.07, 0.17) * mix(0.7, 1.2, a.peat), color: palette[Math.floor(random() * palette.length)] };
    }));
    // A wet hollow scoured round the foot of each stone.
    const wet = new THREE.MeshStandardMaterial({ color: '#14191b', roughness: 0.1, metalness: 0.4 });
    for (const st of stones) {
      if (random() < 0.35) continue;
      const hollow = s.cylinder(1, 1, 0.02, [st.x, surface(st.x, st.z) + 0.02, st.z], wet, 14);
      hollow.scale.set(st.w * 0.62, 1, st.d * 0.55 + 0.12);
      hollow.castShadow = false;
    }

    // What it was for.
    const front = (st: (typeof stones)[number], t: number) => (st.d / 2) * (1 - 0.3 * t) * 1.02 + 0.012;
    if (a.mark === 'outlier') {
      const ox = length / 2 + gap * 1.5;
      const out = makeStone(0.4, 0.75 + bury * 0.4, 0.3);
      out.position.set(ox, 0, curve * -0.4);
      out.rotation.y = rr(-0.4, 0.4);
      s.root.add(out);
      const patch = s.cylinder(0.55, 0.6, 0.03, [ox, 0.012, curve * -0.4], new THREE.MeshStandardMaterial({ color: heath, roughness: 1 }), 14);
      patch.castShadow = false;
    } else if (a.mark === 'quartz') {
      const pebbles = [];
      for (let x = -A * 0.95; x < A * 0.95; x += rr(0.09, 0.16)) { const z = 0.62 + rr(-0.03, 0.03); pebbles.push({ at: [x, surface(x, z) + 0.03, z] as const, size: rr(0.035, 0.06), color: '#f4f2ea' }); }
      s.scatter(new THREE.IcosahedronGeometry(1, 0), new THREE.MeshStandardMaterial({ roughness: 0.3, emissive: '#ffffff', emissiveIntensity: 0.08, flatShading: true }), pebbles);
    } else if (a.mark === 'cups' && tallest) {
      const carve = new THREE.MeshStandardMaterial({ color: rockColour.clone().multiplyScalar(0.4), roughness: 1 });
      const lower = surface(tallest.x, tallest.z);
      for (let i = 0; i < 6; i++) {
        const y = mix(lower + 0.25, tallest.h * 0.72, random()), t = y / tallest.h;
        const x = rr(-0.3, 0.3) * tallest.w * (1 - 0.4 * t), r = rr(0.035, 0.06);
        const cup = new THREE.Mesh(new THREE.CircleGeometry(r, 12), carve);
        cup.position.set(x, y, front(tallest, t));
        tallest.group.add(cup);
        if (i < 3) for (let k = 1; k <= 2; k++) { const ring = new THREE.Mesh(new THREE.RingGeometry(r + k * 0.035, r + k * 0.035 + 0.014, 20), carve); ring.position.copy(cup.position); tallest.group.add(ring); }
      }
    } else if (a.mark === 'ogham' && tallest) {
      const carve = new THREE.MeshStandardMaterial({ color: rockColour.clone().multiplyScalar(0.35), roughness: 1 });
      const lower = surface(tallest.x, tallest.z) + 0.2;
      let y = lower;
      const stem = new THREE.Mesh(new THREE.BoxGeometry(0.014, tallest.h * 0.7 - lower, 0.01), carve);
      stem.position.set(0, (lower + tallest.h * 0.7) / 2, front(tallest, 0.4));
      tallest.group.add(stem);
      while (y < tallest.h * 0.68) {
        const strokes = 1 + Math.floor(random() * 5), side = Math.floor(random() * 3) - 1;
        for (let k = 0; k < strokes; k++) {
          const len = side === 0 ? 0.16 : 0.09;
          const notch = new THREE.Mesh(new THREE.BoxGeometry(len, 0.014, 0.01), carve);
          notch.position.set(side * 0.05, y, front(tallest, y / tallest.h));
          tallest.group.add(notch);
          y += 0.04;
        }
        y += 0.07;
      }
    }

    // Visitors.
    const vx = tallest ? tallest.x : 0, vz = (tallest ? tallest.z : 0) + 0.75, vy = surface(vx, vz);
    let flame: THREE.Mesh | null = null;
    if (a.visitors === 'offerings') {
      const metals = ['#c9a646', '#b9bcc0', '#a8683c'];
      s.scatter(new THREE.CylinderGeometry(0.02, 0.02, 0.005, 8), new THREE.MeshStandardMaterial({ metalness: 0.9, roughness: 0.3 }), Array.from({ length: 14 }, () => ({ at: [vx + rr(-0.3, 0.3), vy + 0.03, vz - 0.3 + rr(-0.15, 0.15)] as const, size: rr(0.9, 1.4), color: metals[Math.floor(random() * 3)] })));
      const cols = mood.cheer > 0.4 ? ['#d94a3a', '#f1c93a', '#f4f0e6', '#b05ab8'] : ['#9a5a50', '#b9b08a', '#d8d4c8'];
      for (let i = 0; i < 7; i++) {
        s.rod([vx + 0.2, vy + 0.04, vz - 0.1], [vx + 0.32 + i * 0.012, vy + 0.07, vz - 0.38 + rr(-0.03, 0.03)], 0.006, s.material('#5c7a3a'));
        s.ball([0.035, 0.03, 0.035], [vx + 0.32 + rr(-0.05, 0.05), vy + 0.09, vz - 0.4 + rr(-0.05, 0.05)], s.material(cols[i % cols.length], { emissive: cols[i % cols.length], emissiveIntensity: 0.15 }), 8);
      }
      if (tallest) for (let i = 0; i < 3; i++) {
        const y = tallest.h * rr(0.45, 0.7);
        const band = s.ring(tallest.w * 0.42, 0.012, [tallest.x, y, tallest.z], s.material(cols[i % cols.length], { roughness: 1 }));
        band.rotation.x = Math.PI / 2;
        band.scale.y = Math.max(0.6, tallest.d / tallest.w);
        const tail = s.box([0.035, 0.3, 0.006], [tallest.x + tallest.w * 0.4, y - 0.15, tallest.z + 0.05], s.material(cols[i % cols.length], { roughness: 1 }));
        tail.rotation.z = mix(0.05, 0.5, mood.energy);
      }
    } else if (a.visitors === 'sheep') {
      const sheep = new THREE.Group();
      const wool = s.material(C('#e4dfd0').lerp(C('#a59c88'), mood.wear * 0.6), { roughness: 1, flatShading: true });
      const face = s.material('#26221f', { roughness: 0.8 });
      const add = (geometry: THREE.BufferGeometry, material: THREE.Material, sc: [number, number, number], at: [number, number, number]) => { const m = new THREE.Mesh(geometry, material); m.scale.set(...sc); m.position.set(...at); m.castShadow = true; sheep.add(m); return m; };
      add(new THREE.IcosahedronGeometry(1, 1), wool, [0.27, 0.25, 0.42], [0, 0.52, 0]);
      add(new THREE.IcosahedronGeometry(1, 1), wool, [0.16, 0.14, 0.14], [0, 0.72, 0.36]);
      add(new THREE.SphereGeometry(1, 10, 8), face, [0.08, 0.09, 0.14], [0, 0.66, 0.5]);
      for (const sx of [-1, 1]) {
        add(new THREE.SphereGeometry(1, 6, 5), face, [0.05, 0.02, 0.03], [sx * 0.11, 0.72, 0.42]);
        for (const sz of [-1, 1]) add(new THREE.CylinderGeometry(1, 1, 1, 6), face, [0.03, 0.34, 0.03], [sx * 0.13, 0.17, sz * 0.24]);
      }
      if (mood.cheer > 0.3) add(new THREE.SphereGeometry(1, 8, 6), s.material(mood.cheer > 0.65 ? '#d0352b' : '#2f5f9a', { roughness: 1 }), [0.1, 0.04, 0.1], [0.05, 0.76, -0.12]);
      sheep.position.set(vx + 0.75, vy, vz + 0.05);
      sheep.rotation.y = rr(-2.2, -0.9);
      s.root.add(sheep);
    } else if (a.visitors === 'survey') {
      const poles: [number, number][] = [[-A * 0.8, 0.85], [A * 0.8, 0.85], [vx, vz + 0.2]];
      for (const [x, z] of poles) {
        const y0 = surface(x, z);
        for (let k = 0; k < 4; k++) s.cylinder(0.016, 0.016, 0.4, [x, y0 + 0.2 + k * 0.4, z], s.material(k % 2 ? '#f1eee4' : '#cf2d22', { roughness: 0.5 }), 8);
      }
      const yA = surface(poles[0][0], 0.85) + 0.25, yB = surface(poles[1][0], 0.85) + 0.25;
      s.rod([poles[0][0], yA, 0.85], [poles[1][0], yB, 0.85], 0.006, s.material('#f1c93a', { emissive: '#f1c93a', emissiveIntensity: 0.3 }));
      // A small excavation square with its spoil heap.
      const tx = -A * 0.45, tz = 0.95;
      s.box([0.8, 0.02, 0.5], [tx, surface(tx, tz) + 0.035, tz], s.material('#1f1814', { roughness: 0.7 })).castShadow = false;
      s.ball([0.3, 0.16, 0.25], [tx - 0.75, surface(tx - 0.75, tz), tz], s.material('#2e241c', { roughness: 1 }), 10);
    } else if (a.visitors === 'fence') {
      const wire = s.material('#6f6a62', { metalness: 0.6, roughness: 0.5 });
      const posts: [number, number, number][] = stones.filter((st) => st.standing).map((st) => [st.x, Math.min(st.h * 0.8, surface(st.x, st.z) + 1.1), st.z + st.d * 0.5]);
      const ends: [number, number, number][] = [[-A - 0.35, 1.05, 0.15], [A + 0.35, 1.05, 0.15]];
      for (const [x, y, z] of ends) { const post = s.cylinder(0.04, 0.05, y, [x, y / 2, z], s.material('#7d6c52', { roughness: 1 }), 6); post.rotation.z = rr(-0.12, 0.12); }
      const line = [ends[0], ...posts.sort((p, q) => p[0] - q[0]), ends[1]];
      for (let i = 0; i < line.length - 1; i++)
        for (const k of [0.95, 0.65, 0.35]) {
          const y0 = Math.max(surface(line[i][0], line[i][2]) + 0.1, line[i][1] * k), y1 = Math.max(surface(line[i + 1][0], line[i + 1][2]) + 0.1, line[i + 1][1] * k);
          s.rod([line[i][0], y0, line[i][2]], [line[i + 1][0], y1, line[i + 1][2]], 0.006, wire);
        }
      // Wool caught on the wire.
      for (let i = 0; i < 4; i++) { const st = line[1 + Math.floor(random() * Math.max(1, line.length - 2))]; s.ball([0.05, 0.03, 0.03], [st[0] + rr(-0.5, 0.5), st[1] * 0.65, st[2]], s.material('#e9e4d6', { roughness: 1 }), 6); }
    } else if (a.visitors === 'candles') {
      const wax = s.material('#e9e2cc', { roughness: 0.6 });
      for (let i = 0; i < 6; i++) s.cylinder(0.018, 0.02, rr(0.03, 0.1), [vx + rr(-0.35, 0.35), vy + 0.05, vz - 0.3 + rr(-0.12, 0.12)], wax, 8);
      const glass = new THREE.MeshStandardMaterial({ color: '#fff3c9', transparent: true, opacity: 0.3, depthWrite: false, roughness: 0.1 });
      const iron = s.material('#22201e', { metalness: 0.5 });
      const lx = vx + 0.1, lz = vz - 0.05;
      s.box([0.14, 0.02, 0.14], [lx, vy + 0.03, lz], iron);
      s.box([0.12, 0.2, 0.12], [lx, vy + 0.14, lz], glass);
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) s.box([0.012, 0.2, 0.012], [lx + sx * 0.06, vy + 0.14, lz + sz * 0.06], iron);
      const cap = s.mesh(new THREE.ConeGeometry(0.11, 0.07, 4), iron, [lx, vy + 0.275, lz]);
      cap.rotation.y = Math.PI / 4;
      s.ring(0.04, 0.006, [lx, vy + 0.33, lz], iron);
      flame = s.ball([0.022, 0.045, 0.022], [lx, vy + 0.11, lz], new THREE.MeshStandardMaterial({ color: '#ffd27a', emissive: '#ffb23a', emissiveIntensity: 2.2 }), 8);
      const halo = s.ball([0.3, 0.3, 0.3], [lx, vy + 0.14, lz], new THREE.MeshBasicMaterial({ color: '#ffc45a', transparent: true, opacity: 0.12, depthWrite: false, blending: THREE.AdditiveBlending }), 12);
      halo.castShadow = false;
    }

    const flicker = mix(0.1, 0.5, mood.energy);
    return s.finish({
      footprint: Math.min(A, 2.6),
      update: flame ? (_dt, time) => { flame!.scale.y = 0.045 * (1 + Math.sin(time * 11) * flicker * 0.4 + Math.sin(time * 23) * flicker * 0.2); } : undefined,
    });
  },
});
