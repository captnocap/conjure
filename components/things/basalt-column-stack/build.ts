import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul, score } from '@conjure/kit';

const STONES = {
  charcoal: { say: 'Charcoal grey, the usual weathered basalt.', side: '#4a4b50', top: '#77787a' },
  rust: { say: 'Rust-brown, iron bleeding out of old rock.', side: '#6b4534', top: '#9a7257' },
  blueblack: { say: 'Blue-black and fresh, barely cooled.', side: '#2b3040', top: '#4c566b' },
  ash: { say: 'Pale ash grey, bleached and dusty.', side: '#8d8a83', top: '#b9b5ab' },
  oxblood: { say: 'Dark oxblood red, baked by a hot sky.', side: '#5a2a2a', top: '#8a4a40' },
} as const;

export default defineThing({
  questions: {
    form: choice('What shape is the outcrop?', {
      cliff: 'A stepped cliff wall, low at the front and rising to a high back.',
      causeway: 'A low pavement of stepping-stone tops, barely rising, made to be walked on.',
      stack: 'A lone tall stack, columns bunched like a fist of pencils.',
      fan: 'Columns splayed outward in a fan, as if the rock had bloomed.',
      amphitheatre: 'A curved horseshoe of columns around an empty floor.',
    }),
    height: score('How tall are the tallest columns?', ['Knee-high stumps', 'Head high', 'A house high', 'Towering organ pipes']),
    girth: choice('How thick is each column?', {
      slender: 'Slender as fence posts, hundreds of them.',
      usual: 'Barrel-thick, the classic.',
      fat: 'Fat drums a person could lie on.',
    }),
    stone: choice('What colour is the rock?', Object.fromEntries(Object.entries(STONES).map(([k, v]) => [k, v.say])) as Record<keyof typeof STONES, string>),
    breakage: choice('How broken is it?', {
      intact: 'Whole and crisp, every column standing.',
      toppled: 'A few columns have fallen and lie at the foot like dropped organ pipes.',
      collapsed: 'One side has given way into a heap of broken drums.',
      leaning: 'Still standing, but several columns lean away, about to go.',
    }),
    seams: choice('What fills the cracks and covers the tops?', {
      bare: 'Nothing: bare dark joints.',
      lava: 'Molten light glows in the seams between the columns.',
      moss: 'Moss and small ferns on the tops and in the joints.',
      frost: 'Snow caps on every top.',
      lichen: 'Splashes of ochre and orange lichen.',
      tide: 'A wet dark tide line with pale barnacle crust below it.',
    }),
    left: choice('What has someone left on it?', {
      nothing: 'Nothing: no one has been here.',
      cairn: 'A cairn of balanced stones on the highest top.',
      flag: 'A pole with a ragged pennant planted at the summit.',
      candles: 'Small lit candles set on the low front steps.',
      rope: 'A knotted climbing rope hanging down the face.',
    }),
    pool: noul('Is there a still pool of water (or something else) lying at its foot?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const stone = STONES[a.stone];
    const r = { slender: 0.2, usual: 0.36, fat: 0.58 }[a.girth];
    const W = { slender: 3.6, usual: 5.2, fat: 7 }[a.girth] * (a.form === 'stack' ? 0.5 : a.form === 'causeway' ? 1.15 : 1);
    const D = W * (a.form === 'stack' ? 1 : a.form === 'amphitheatre' ? 0.95 : 0.62);
    const top = mix(1.1, 9, a.height) * (a.form === 'causeway' ? 0.22 : a.form === 'stack' ? 1.15 : 1);
    const seed = random() * 40;
    const noise = (x: number, z: number) => Math.sin(x * 1.3 + seed) * Math.cos(z * 1.7 + seed * 1.3) * 0.5 + Math.sin((x + z) * 2.9 + seed * 2) * 0.25;

    type Column = { x: number; z: number; h: number; q: number; row: number; tiltX: number; tiltZ: number };
    const columns: Column[] = [];
    const present = new Set<string>();
    const rows = Math.ceil(D / (1.5 * r)), cols = Math.ceil(W / (Math.sqrt(3) * r));
    const collapseSide = random() < 0.5 ? -1 : 1;
    for (let row = -rows; row <= rows; row++)
      for (let q = -cols; q <= cols; q++) {
        const x = Math.sqrt(3) * r * (q + (Math.abs(row) % 2) / 2), z = 1.5 * r * row;
        const u = x / (W / 2), v = z / (D / 2);
        const edge = u * u + v * v + noise(x, z) * 0.25;
        if (edge > 1) continue;
        let h: number;
        if (a.form === 'cliff') h = top * mix(0.08, 1, Math.pow(THREE.MathUtils.clamp(0.5 - v * 0.62, 0, 1), 1.4)) * (1 - 0.35 * u * u);
        else if (a.form === 'causeway') h = top * (0.45 + 0.55 * (1 - edge)) ;
        else if (a.form === 'stack') h = top * mix(0.25, 1, Math.pow(1 - Math.min(1, edge), 0.7));
        else if (a.form === 'fan') h = top * mix(0.3, 1, 1 - Math.abs(u) * 0.7) * mix(0.5, 1, 0.5 - v * 0.5);
        else {
          const d = Math.hypot(u, v - 0.25);
          if (d < 0.5) continue;
          h = top * mix(0.1, 1, THREE.MathUtils.clamp((d - 0.5) * 2.4, 0, 1)) * mix(0.25, 1, THREE.MathUtils.clamp(0.6 - v * 0.6, 0, 1));
        }
        // Columns break off at joints, so heights step rather than slope.
        const step = Math.max(0.12, top / 14);
        h = Math.max(step, Math.round((h * (0.82 + random() * 0.36) + noise(x * 2, z * 2) * top * 0.12) / step) * step);
        let tiltX = (random() - 0.5) * 0.03, tiltZ = (random() - 0.5) * 0.03;
        if (a.form === 'fan') tiltZ += -u * 0.5;
        if (a.breakage === 'collapsed' && u * collapseSide > 0.15 + noise(z, x) * 0.2) h = Math.max(step, h * (0.12 + random() * 0.2));
        if (a.breakage === 'leaning' && random() < 0.22) { tiltZ += (random() - 0.3) * 0.35 * Math.sign(u || 1) * -1; tiltX += (random() - 0.2) * 0.25; }
        if (mood.wear > 0.5 && random() < (mood.wear - 0.5) * 0.4) h = Math.max(step, h * (0.4 + random() * 0.4));
        columns.push({ x, z, h, q, row, tiltX, tiltZ });
        present.add(`${q},${row}`);
      }
    const byKey = new Map(columns.map((c) => [`${c.q},${c.row}`, c]));

    const sideColour = new THREE.Color(stone.side), topColour = new THREE.Color(stone.top);
    const prism = new THREE.CylinderGeometry(1, 1, 1, 6).translate(0, 0.5, 0);
    const rockMaterial = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.9, flatShading: true });
    const shafts = new THREE.InstancedMesh(prism, rockMaterial, columns.length);
    const capMaterial = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: a.seams === 'frost' ? 0.6 : 0.95, flatShading: true });
    const caps = new THREE.InstancedMesh(prism.clone(), capMaterial, columns.length);
    const m = new THREE.Matrix4(), quat = new THREE.Quaternion(), euler = new THREE.Euler(), tint = new THREE.Color();
    const capTint = { bare: topColour, lava: topColour, moss: new THREE.Color('#5f8a3a').lerp(new THREE.Color('#8fbf3f'), mood.cheer * 0.6), frost: new THREE.Color('#eef3f6'), lichen: new THREE.Color('#d39a2c'), tide: topColour }[a.seams];
    const gap = a.seams === 'lava' ? 0.84 : 0.955;
    const tideLine = top * 0.3;
    columns.forEach((c, i) => {
      quat.setFromEuler(euler.set(c.tiltX, random() * 0.1, c.tiltZ));
      m.compose(new THREE.Vector3(c.x, 0, c.z), quat, new THREE.Vector3(r * gap, c.h, r * gap));
      shafts.setMatrixAt(i, m);
      const shade = 0.82 + random() * 0.36;
      tint.copy(sideColour).multiplyScalar(shade);
      if (a.seams === 'tide' && c.h < tideLine) tint.lerp(new THREE.Color('#c9c6b4'), 0.55);
      shafts.setColorAt(i, tint);
      const capThick = a.seams === 'frost' ? 0.09 + random() * 0.1 : a.seams === 'moss' ? 0.05 : 0.025;
      const covered = a.seams === 'frost' || (a.seams === 'moss' && random() < 0.7) || (a.seams === 'lichen' && random() < 0.35);
      const up = new THREE.Vector3(0, c.h, 0).applyQuaternion(quat);
      m.compose(new THREE.Vector3(c.x + up.x, up.y, c.z + up.z), quat, new THREE.Vector3(r * gap * (covered ? 0.97 : 0.86), capThick, r * gap * (covered ? 0.97 : 0.86)));
      caps.setMatrixAt(i, m);
      caps.setColorAt(i, tint.copy(covered ? capTint : topColour).multiplyScalar(0.88 + random() * 0.24));
    });
    for (const mesh of [shafts, caps]) {
      mesh.castShadow = mesh.receiveShadow = true;
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      s.root.add(mesh);
    }

    // Molten seams: a glowing core behind every enclosed joint.
    let glow: THREE.MeshStandardMaterial | null = null;
    if (a.seams === 'lava') {
      glow = new THREE.MeshStandardMaterial({ color: '#ff7a1e', emissive: '#ff5a12', emissiveIntensity: mix(1, 2, mood.warmth), roughness: 0.6 });
      const inner: { x: number; z: number; h: number }[] = [];
      for (const c of columns) {
        const odd = Math.abs(c.row) % 2;
        // Each grid corner is shared by three columns; light the cavity where they meet.
        for (const dir of [1, -1]) {
          const others = [byKey.get(`${c.q - 1 + odd},${c.row + dir}`), byKey.get(`${c.q + odd},${c.row + dir}`)].filter((n): n is Column => !!n);
          if (!others.length) continue;
          const heights = [c.h, ...others.map((n) => n.h)].sort((p, q) => q - p);
          inner.push({ x: c.x, z: c.z + dir * r, h: heights[1] - 0.03 });
        }
      }
      const cores = new THREE.InstancedMesh(new THREE.CylinderGeometry(1, 1, 1, 5).translate(0, 0.5, 0), glow, Math.max(inner.length, 1));
      inner.forEach(({ x, z, h }, i) => cores.setMatrixAt(i, m.compose(new THREE.Vector3(x, 0, z), quat.identity(), new THREE.Vector3(r * 0.2, Math.max(0.05, h), r * 0.2))));
      cores.count = inner.length;
      s.root.add(cores);
    }

    // Fallen columns and broken drums.
    const fallen = { intact: 0, toppled: 4 + Math.floor(random() * 3), collapsed: 9 + Math.floor(random() * 4), leaning: 1 }[a.breakage] + Math.round(mood.wear * 2);
    if (fallen > 0) {
      const drums = new THREE.InstancedMesh(prism.clone(), rockMaterial, fallen * 3);
      let n = 0;
      for (let i = 0; i < fallen; i++) {
        const heap = a.breakage === 'collapsed';
        const cx = heap ? collapseSide * W * (0.22 + random() * 0.32) : (random() - 0.5) * W * 0.85;
        const cz = heap ? (random() - 0.5) * D * 0.9 : D / 2 + r * 1.2 + random() * r * 3;
        const yaw = heap ? random() * Math.PI : Math.PI / 2 + (random() - 0.5) * 0.7;
        const length = Math.max(r * 2, top * (0.25 + random() * 0.5));
        const lift = heap ? random() * r * 1.6 : 0;
        const pitch = heap ? (random() - 0.5) * 0.7 : (random() - 0.5) * 0.12;
        // Each fallen column has snapped into drums along its joints.
        const pieces = 1 + Math.floor(random() * 3);
        const axis = new THREE.Vector3(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch));
        quat.setFromUnitVectors(new THREE.Vector3(0, 1, 0), axis);
        let along = -length / 2;
        for (let p = 0; p < pieces; p++) {
          const part = (length / pieces) * (0.82 + random() * 0.1);
          const at = new THREE.Vector3(cx, r * 0.87 + lift + Math.abs(Math.sin(pitch)) * length * 0.5, cz).addScaledVector(axis, along);
          drums.setMatrixAt(n, m.compose(at, quat, new THREE.Vector3(r * 0.95, part, r * 0.95)));
          drums.setColorAt(n, tint.copy(sideColour).multiplyScalar(0.8 + random() * 0.4));
          n++;
          along += length / pieces + random() * r * 0.5;
        }
      }
      drums.count = n;
      drums.castShadow = drums.receiveShadow = true;
      if (drums.instanceColor) drums.instanceColor.needsUpdate = true;
      s.root.add(drums);
    }

    // Growth in the joints.
    if (a.seams === 'moss' || a.seams === 'lichen') {
      const tufts = [];
      const count = Math.round(columns.length * 0.5);
      for (let i = 0; i < count; i++) {
        const c = columns[Math.floor(random() * columns.length)];
        const t = random() * Math.PI * 2;
        tufts.push({ at: [c.x + Math.cos(t) * r * 0.8, c.h * (a.seams === 'moss' ? 0.9 + random() * 0.1 : random()), c.z + Math.sin(t) * r * 0.8] as const, size: r * (0.2 + random() * 0.3), color: a.seams === 'moss' ? (random() < 0.5 ? '#4f7d2e' : '#7fae3c') : (random() < 0.5 ? '#e0a02a' : '#e86a24') });
      }
      s.scatter(new THREE.IcosahedronGeometry(1, 0), new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 1, flatShading: true }), tufts);
    }

    const summit = columns.reduce((best, c) => (c.h > best.h ? c : best), columns[0]);
    const iron = s.material('#3a3a3c', { roughness: 0.7 });
    if (a.left === 'cairn') {
      let y = summit.h + 0.03;
      for (let i = 0; i < 5; i++) {
        const size = r * mix(0.62, 0.22, i / 4);
        s.ball([size * (1 + random() * 0.3), size * 0.55, size], [summit.x + (random() - 0.5) * size * 0.3, y + size * 0.5, summit.z], s.material(i % 2 ? '#8b8a84' : '#5f6066'), 10).rotation.y = random() * 3;
        y += size * 1.0;
      }
    } else if (a.left === 'flag') {
      const pole = Math.max(1.2, top * 0.3);
      s.rod([summit.x, summit.h, summit.z], [summit.x + 0.06, summit.h + pole, summit.z], 0.03, iron, 0.02);
      const rag = new THREE.PlaneGeometry(pole * 0.55, pole * 0.3, 8, 3);
      const p = rag.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < p.count; i++) p.setZ(i, Math.sin(p.getX(i) * 9 / pole + seed) * 0.08 * pole * (p.getX(i) / pole + 0.3));
      rag.computeVertexNormals();
      s.mesh(rag, new THREE.MeshStandardMaterial({ color: mood.cheer > 0.5 ? '#e0452c' : '#b9b09a', side: THREE.DoubleSide, roughness: 0.9 }), [summit.x + 0.06 + pole * 0.29, summit.h + pole * 0.82, summit.z]);
    } else if (a.left === 'candles') {
      const low = columns.filter((c) => c.h < top * 0.45).sort((p, q) => q.z - p.z).slice(0, Math.max(4, Math.round(columns.length * 0.12)));
      const wax = s.material('#f1e6c8'), flame = new THREE.MeshStandardMaterial({ color: '#ffd46a', emissive: '#ffb030', emissiveIntensity: 2.2 });
      for (const c of low.length ? low : [summit]) {
        if (random() < 0.3) continue;
        const tall = 0.1 + random() * 0.2;
        s.cylinder(0.05, 0.06, tall, [c.x, c.h + tall / 2 + 0.02, c.z], wax, 8);
        s.ball([0.04, 0.085, 0.04], [c.x, c.h + tall + 0.1, c.z], flame, 8);
      }
    } else if (a.left === 'rope') {
      const face = columns.filter((c) => c.h > top * 0.6).sort((p, q) => q.z - p.z)[0] ?? summit;
      const fx = face.x, fz = face.z + r * 1.1;
      s.rod([fx, face.h - 0.1, face.z], [fx, face.h + 0.35, face.z], 0.035, iron);
      const rope = s.material('#b89a62', { roughness: 1 });
      s.tube([[fx, face.h + 0.3, face.z], [fx, face.h + 0.1, fz], [fx + 0.05, face.h * 0.6, fz + 0.05], [fx - 0.04, face.h * 0.3, fz + 0.12], [fx + 0.1, 0.25, fz + 0.2]], 0.03, rope);
      for (let k = 1; k < 6; k++) s.ball([0.06, 0.06, 0.06], [fx, face.h * (k / 6.5) + 0.2, fz + 0.06], rope, 8);
    }

    if (a.pool) {
      const hot = a.seams === 'lava';
      const water = new THREE.MeshStandardMaterial(hot
        ? { color: '#ff8a2a', emissive: '#ff5a12', emissiveIntensity: mix(0.9, 1.8, mood.warmth), roughness: 0.5 }
        : { color: a.seams === 'frost' ? '#cfe6ee' : '#3f6f7c', roughness: 0.08, metalness: 0.4 });
      const pond = s.cylinder(W * 0.3, W * 0.3, 0.04, [-W * 0.12, 0.02, D / 2 + W * 0.2], water, 28);
      pond.scale.set(1.25, 1, 0.6);
    }

    const pulse = glow;
    return s.finish({
      footprint: Math.max(W, D) * 0.55,
      update: pulse ? (_dt, time) => { pulse.emissiveIntensity = mix(1, 2, mood.warmth) * (1 + Math.sin(time * mix(0.6, 2.4, mood.energy)) * 0.18); } : undefined,
    });
  },
});
