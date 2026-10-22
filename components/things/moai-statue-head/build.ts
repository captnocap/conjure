import * as THREE from 'three';
import { Sculpture, choice, defineThing, disposeTree, mix } from '@conjure/kit';
import { bell, fbm, noise3, ramp } from './head';

const KEYS: readonly (readonly [number, number, number])[] = [
  [0, 0.72, 0.46], [1.2, 0.78, 0.5], [2.0, 0.82, 0.48], [2.28, 0.74, 0.45], [2.48, 0.46, 0.42], [2.66, 0.5, 0.5], [3.0, 0.56, 0.57], [4.0, 0.53, 0.57], [4.32, 0.5, 0.53], [4.4, 0.44, 0.47],
];
const TOP = 4.4, CHIN = 2.6, FACE = 1.8;

interface MoaiOptions { seed: number; from: number; wear: number; tints: THREE.Color[]; lichen: number; plain: boolean }

function moai(o: MoaiOptions) {
  const sd = (o.seed % 977) * 1.37;
  const widths = (y: number) => {
    let i = 0;
    while (i < KEYS.length - 2 && KEYS[i + 1][0] < y) i++;
    const a = KEYS[i], b = KEYS[i + 1], t = ramp(a[0], b[0], y);
    return [mix(a[1], b[1], t), mix(a[2], b[2], t)] as const;
  };
  const info = { recess: 0 };
  const surf = (az: number, y: number, out: THREE.Vector3) => {
    const [wx, wz] = widths(y);
    const sn = Math.sin(az), cs = Math.cos(az);
    const r = 1 / Math.pow(Math.pow(Math.abs(sn / wx), 3.4) + Math.pow(Math.abs(cs / wz), 3.4), 1 / 3.4);
    let x = sn * r, z = cs * r;
    const xn = x / wx, ax = Math.abs(xn), t = (y - CHIN) / FACE;
    let dz = 0, recess = 0;
    if (cs > 0 && y > CHIN - 0.2) {
      const front = ramp(0, 0.5, cs);
      dz += 0.22 * bell(t - 0.67, 0.045) * ramp(1.08, 0.8, ax) - 0.14 * ramp(0.72, 1.0, t);
      const socket = 0.15 * bell(ax - 0.47, 0.24) * bell(t - 0.565, 0.05);
      dz -= socket; recess += socket * 5;
      const nt = Math.min(1, Math.max(0, (0.66 - t) / 0.33));
      const under = t < 0.33 ? bell(t - 0.33, 0.022) : 1;
      dz += (t < 0.68 ? 1 : 0) * (0.1 + 0.27 * Math.pow(nt, 1.3)) * bell(xn, 0.13 + 0.12 * nt) * under;
      dz += 0.13 * bell(ax - 0.34, 0.11) * bell(t - 0.35, 0.035);
      dz -= 0.05 * bell(t - 0.27, 0.03) * bell(xn, 0.6);
      const groove = 0.06 * bell(t - 0.2, 0.013) * bell(xn, 0.42);
      dz += 0.16 * bell(t - 0.2, 0.042) * bell(xn, 0.5) - groove; recess += groove * 9;
      dz += 0.17 * bell(t - 0.06, 0.06) * bell(xn, 0.7) - 0.06 * bell(ax - 0.62, 0.25) * bell(t - 0.36, 0.12);
      dz *= front;
    } else if (cs > 0) {
      // Torso: arms held to the sides, hands toward the belly.
      const arm = 0.08 * bell(ax - 0.86, 0.13) * ramp(2.2, 1.9, y) * ramp(0.2, 0.5, y);
      const hand = 0.06 * bell(y - 0.5, 0.12) * ramp(0.95, 0.5, ax) * ramp(0.1, 0.35, ax);
      dz += arm + hand + 0.07 * bell(y - 0.8, 0.5) * bell(xn, 0.6) + 0.03 * bell(ax - 0.42, 0.06) * bell(y - 1.75, 0.05);
      recess += Math.max(0, 0.05 - arm) * 0;
    }
    z += dz;
    const rough = (fbm(x * 1.6 + sd, y * 1.6, z * 1.6) - 0.5) * mix(0.04, 0.12, o.wear) + (noise3(x * 7, y * 7 + sd, z * 7) - 0.5) * mix(0.012, 0.04, o.wear);
    x += sn * rough; z += cs * rough;
    if (y > TOP - 0.001) { x *= 0.001; z *= 0.001; }
    info.recess = Math.min(1, recess + Math.max(0, -rough) * 3);
    return out.set(x, y, z - (y > CHIN ? (y - CHIN) * 0.03 : 0));
  };
  const nu = 100, nv = Math.max(24, Math.round((TOP - o.from) * 34));
  const count = (nu + 1) * (nv + 2);
  const position = new Float32Array(count * 3), colour = new Float32Array(count * 3);
  const p = new THREE.Vector3(), c = new THREE.Color();
  for (let j = 0; j <= nv + 1; j++)
    for (let i = 0; i <= nu; i++) {
      const a = (i / nu) * 2 - 1, az = Math.PI * (0.55 * a + 0.45 * a * a * a);
      const y = j > nv ? TOP : mix(o.from, TOP - 0.002, j / nv);
      surf(az, y, p);
      const k = i + j * (nu + 1);
      p.toArray(position, k * 3);
      c.copy(o.tints[0]);
      if (!o.plain) {
        const streak = noise3(Math.sin(az) * 5 + sd, y * 0.5, Math.cos(az) * 5);
        c.lerp(o.tints[1], ramp(0.4, 0.85, streak) * 0.6 + info.recess * 0.7);
        const spot = noise3(p.x * 6 + sd, p.y * 6, p.z * 6);
        if (spot > 1 - o.lichen * 0.27) c.lerp(o.tints[2], 0.6);
        else if (spot < o.lichen * 0.16) c.lerp(o.tints[3], 0.6);
        c.lerp(o.tints[4], ramp(o.from + 1.3, o.from + 0.3, y) * 0.5 * o.lichen);
      } else c.lerp(o.tints[1], info.recess * 0.8);
      c.toArray(colour, k * 3);
    }
  const index: number[] = [];
  for (let j = 0; j <= nv; j++)
    for (let i = 0; i < nu; i++) {
      const k = i + j * (nu + 1);
      index.push(k, k + 1, k + nu + 1, k + 1, k + nu + 2, k + nu + 1);
    }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(position, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colour, 3));
  geometry.setIndex(index);
  geometry.computeVertexNormals();
  return { geometry, surf };
}

export default defineThing({
  questions: {
    buried: choice('How much of it is above ground?', {
      shoulders: 'Buried to the shoulders in a slope: the famous head and nothing more.',
      chin: 'Sunk deeper still, earth up to the lips, only brow, eyes and nose clear.',
      waist: 'Dug out to the waist, arms and belly showing above a trench.',
      full: 'Full height on a stone platform, the whole body standing.',
      toppled: 'Toppled: lying on its back in the grass, face to the sky.',
    }),
    topknot: choice('What about its red stone topknot?', {
      none: 'It never had one.',
      worn: 'Balanced on its head, a fat red cylinder with a knob.',
      fallen: 'Fallen and lying on its side on the ground beside it.',
    }),
    eyes: choice('What are its eyes like?', {
      empty: 'Empty shadowed sockets under the brow.',
      coral: 'White coral eyes with dark red pupils set into the sockets, staring.',
    }),
    company: choice('Is it alone?', {
      alone: 'Alone.',
      pair: 'One of a pair, the second slightly smaller.',
      row: 'One of a short line of four, all facing the same way.',
    }),
    lean: choice('How does it stand?', {
      straight: 'Dead upright.',
      forward: 'Leaning forward, as if bowing under its own weight.',
      sideways: 'Leaning well to one side, the ground having shifted.',
    }),
    stone: choice('What is it made of?', {
      tuff: 'Yellow-grey volcanic tuff, weathered and streaked.',
      basalt: 'Dark grey basalt, harder and sharper.',
      souvenir: 'It is a souvenir: glossy brown resin on a little round base with a label.',
    }),
    foot: choice('What is at its foot?', {
      nothing: 'Nothing but grass.',
      barrier: 'A low rope barrier and a small sign asking visitors to keep off.',
      figure: 'A single person standing near it, tiny by comparison.',
      tools: 'Abandoned stone picks and chippings, as if the carvers had just left.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const souvenir = a.stone === 'souvenir';
    const tints = (souvenir ? ['#5a3a26', '#2a1a12', '#5a3a26', '#5a3a26', '#5a3a26'] : a.stone === 'basalt' ? ['#5d5f60', '#313335', '#cfd1c4', '#c48a3a', '#55683d'] : ['#9a8f78', '#5d5547', '#dcdccd', '#c9923c', '#6d7a45']).map((hex) => new THREE.Color(hex));
    if (!souvenir) tints[0].lerp(new THREE.Color(mood.warmth > 0.5 ? '#b8935f' : '#7f8890'), Math.abs(mood.warmth - 0.5) * 0.5);
    const stone = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: souvenir ? 0.25 : 0.95 });
    const plain = new THREE.MeshStandardMaterial({ color: tints[0], roughness: souvenir ? 0.25 : 0.95 });
    const red = new THREE.MeshStandardMaterial({ color: souvenir ? '#7a2f22' : '#8c3f2c', roughness: souvenir ? 0.3 : 0.95 });
    const world = new THREE.Group();
    s.root.add(world);
    const add = <T extends THREE.Object3D>(node: T, parent: THREE.Object3D = world) => { node.traverse((child) => { child.castShadow = child.receiveShadow = true; }); parent.add(node); return node; };

    const toppled = a.buried === 'toppled' && !souvenir;
    const depth = souvenir ? 0 : { shoulders: 2.12, chin: 2.78, waist: 0.95, full: 0, toppled: 0 }[a.buried];
    const ahu = !souvenir && a.buried === 'full' ? 0.8 : 0;
    const n = { alone: 1, pair: 2, row: 4 }[a.company];
    const pitch = 1.95;
    const side = random() < 0.5 ? -1 : 1;
    const span = (n - 1) * pitch;
    const rx0 = span / 2 + (a.topknot === 'fallen' ? 2.25 : 1.4), rz0 = ahu ? 3.3 : toppled ? 3.1 : 1.5;

    for (let i = 0; i < n; i++) {
      const scale = i === 0 ? 1 : mix(0.78, 0.98, random());
      const x = (i - (n - 1) / 2) * pitch * (toppled ? 1.15 : 1);
      const sink = depth + (i === 0 ? 0 : (random() - 0.5) * 0.5 * (depth > 0 ? 1 : 0));
      const from = toppled ? 0 : Math.max(0, sink - 0.7);
      const made = moai({ seed: context.seed + i * 53, from, wear: souvenir ? 0 : mood.wear, tints, lichen: mix(0.25, 1, mood.wear), plain: souvenir });
      const figure = new THREE.Group();
      add(new THREE.Mesh(made.geometry, stone), figure);
      for (const sgn of [-1, 1]) {
        const ear = add(new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.95, 0.26), plain), figure);
        ear.position.set(sgn * 0.565, CHIN + 0.52 * FACE, -0.06); ear.rotation.z = sgn * 0.02;
      }
      if (a.eyes === 'coral')
        for (const sgn of [-1, 1]) {
          const az = sgn * 0.42, at = made.surf(az, CHIN + 0.565 * FACE, new THREE.Vector3());
          const white = add(new THREE.Mesh(new THREE.SphereGeometry(1, 14, 10), new THREE.MeshStandardMaterial({ color: '#f1ede0', roughness: 0.6 })), figure);
          white.scale.set(0.15, 0.085, 0.05); white.position.copy(at).add(new THREE.Vector3(0, 0, 0.03));
          const pupil = add(new THREE.Mesh(new THREE.SphereGeometry(1, 12, 8), new THREE.MeshStandardMaterial({ color: '#5a1d14', roughness: 0.5 })), figure);
          pupil.scale.set(0.055, 0.06, 0.03); pupil.position.copy(at).add(new THREE.Vector3(0, 0.005, 0.07));
        }
      const hat = () => {
        const pukao = new THREE.Group();
        add(new THREE.Mesh(new THREE.LatheGeometry([[0, 0], [0.62, 0], [0.68, 0.1], [0.7, 0.5], [0.62, 0.72], [0.3, 0.76], [0.3, 0.95], [0.22, 1.0], [0, 1.0]].map(([r, y]) => new THREE.Vector2(r, y)), 22), red), pukao);
        return pukao;
      };
      if (a.topknot === 'worn' && !toppled && (i === 0 || random() < 0.6)) { const pukao = hat(); pukao.position.set(0, TOP - 0.03, -0.07); pukao.rotation.z = (random() - 0.5) * 0.08; pukao.scale.set(0.84, 0.8, 0.8); figure.add(pukao); }
      figure.scale.setScalar(scale);
      const holder = new THREE.Group();
      if (toppled) {
        holder.rotation.set(-Math.PI / 2 + 0.06, 0, (random() - 0.5) * 0.3);
        holder.position.set(x, 0.12, TOP * scale * 0.5);
      } else {
        holder.position.set(x, ahu - sink * scale, 0);
        const pivot = sink;
        const tilt = { straight: 0.02, forward: 0.17, sideways: 0.05 }[a.lean] + (i === 0 ? 0 : (random() - 0.5) * 0.06);
        const roll = (a.lean === 'sideways' ? 0.2 * side : 0) + (random() - 0.5) * (souvenir ? 0 : 0.05);
        figure.position.y = -pivot; holder.position.y += pivot * scale;
        holder.rotation.set(souvenir ? 0 : tilt, 0, roll);
      }
      holder.add(figure);
      world.add(holder);
      if ((a.topknot === 'fallen' || (toppled && a.topknot === 'worn')) && i === 0) {
        const pukao = hat();
        pukao.rotation.set(0, random() * 3, Math.PI / 2 - 0.12);
        pukao.position.set(x + side * (toppled ? 1.0 : 1.45), 0.72, toppled ? -2.3 : 0.35);
        if (ahu) pukao.position.set(x + side * 1.2, 0.62, 2.3);
        add(pukao);
      }
    }

    const rx = span / 2 + (a.topknot === 'fallen' ? 2.25 : 1.4), rz = ahu ? 3.3 : toppled ? 3.1 : 1.5;
    if (souvenir) {
      add(new THREE.Mesh(new THREE.CylinderGeometry(0.95 + span / 2, 1.02 + span / 2, 0.35, 40), new THREE.MeshStandardMaterial({ color: '#2a1a12', roughness: 0.3 }))).position.y = -0.175;
      world.children[world.children.length - 1].scale.z = 1.0 / (0.95 + span / 2);
      const label = s.label('RAPA NUI', 1.2, 0.24, [0, -0.17, 1.03], '#e9d9a0', '#2a1a12');
      world.add(label);
      const sticker = s.label('$' + (4 + Math.floor(random() * 9)) + '.99', 0.6, 0.3, [side * 0.75, -0.01, 0.6], '#b0202a', '#f5e25a');
      sticker.rotation.x = -Math.PI / 2; world.add(sticker);
    } else {
      // The ground it stands in: a low grassy rise, or a stone platform.
      const grass = new THREE.Color(mood.cheer > 0.5 ? '#7d9a4c' : '#8a8a55').lerp(new THREE.Color('#b9a468'), mood.warmth * 0.5);
      const mound = new THREE.SphereGeometry(1, 40, 14, 0, Math.PI * 2, 0, Math.PI / 2);
      const mp = mound.attributes.position as THREE.BufferAttribute;
      const mc = new Float32Array(mp.count * 3), c = new THREE.Color();
      for (let i = 0; i < mp.count; i++) {
        const x = mp.getX(i) * rx, z = mp.getZ(i) * rz, y = mp.getY(i) * (depth > 0 ? 0.55 : 0.22) * (1 + 0.5 * (noise3(x * 0.5 + 3, 0, z * 0.5) - 0.5)) + (depth > 0 ? -z * 0.1 : 0);
        mp.setXYZ(i, x, Math.max(y, mp.getY(i) < 0.01 ? -0.3 : -1), z);
        c.copy(grass).lerp(new THREE.Color('#6b5a3c'), ramp(0.45, 0.8, noise3(x * 0.9, 1, z * 0.9)) * 0.7).toArray(mc, i * 3);
      }
      mound.setAttribute('color', new THREE.BufferAttribute(mc, 3));
      mound.computeVertexNormals();
      add(new THREE.Mesh(mound, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1 })));
      const tufts = Math.round(mix(60, 260, mood.density));
      const blade = new THREE.ConeGeometry(0.05, 0.3, 4);
      const field = new THREE.InstancedMesh(blade, new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 1 }), tufts);
      const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
      for (let i = 0; i < tufts; i++) {
        const ang = random() * Math.PI * 2, r = Math.sqrt(random()) * 0.93;
        const x = Math.cos(ang) * r * rx, z = Math.sin(ang) * r * rz;
        const y = Math.sqrt(Math.max(0, 1 - r * r)) * (depth > 0 ? 0.55 : 0.22) * 0.9 + (depth > 0 ? -z * 0.1 : 0);
        e.set((random() - 0.5) * 0.6, random() * 3, (random() - 0.5) * 0.6);
        m.compose(new THREE.Vector3(x, y + 0.1, z), q.setFromEuler(e), new THREE.Vector3(1, 0.6 + random() * 1.2, 1));
        field.setMatrixAt(i, m);
        field.setColorAt(i, c.copy(grass).multiplyScalar(0.7 + random() * 0.5));
      }
      add(field);
      if (ahu) {
        const wall = new THREE.MeshStandardMaterial({ color: '#6f6a60', roughness: 1 });
        add(new THREE.Mesh(new THREE.BoxGeometry(span + 3.2, ahu, 2.2), wall)).position.set(0, ahu / 2, -0.1);
        const ramp3 = add(new THREE.Mesh(new THREE.BoxGeometry(span + 3.2, 0.12, 1.9), wall)); ramp3.position.set(0, ahu / 2 - 0.05, 1.75); ramp3.rotation.x = 0.42;
        const cobble = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.14, 1), new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 1 }), 150);
        for (let i = 0; i < 150; i++) {
          const u = random(), v = random();
          m.compose(new THREE.Vector3((u - 0.5) * (span + 3.0), ahu - 0.03 - v * 0.74, 1.0 + v * 1.65), q.identity(), new THREE.Vector3(1 + random() * 0.5, 0.55, 1 + random() * 0.5));
          cobble.setMatrixAt(i, m); cobble.setColorAt(i, c.set('#77726a').multiplyScalar(0.75 + random() * 0.5));
        }
        add(cobble);
      }
      const gy = ahu ? 0.05 : depth > 0 ? 0.2 : 0.1;
      if (a.foot === 'barrier') {
        const post = s.material('#8a6a45', { roughness: 0.9 });
        const xs = [-rx * 0.72, -rx * 0.24, rx * 0.24, rx * 0.72], z = ahu ? 2.8 : rz * 0.78;
        for (const x of xs) world.add(s.cylinder(0.05, 0.06, 0.7, [x, gy + 0.2, z], post, 8));
        for (let i = 0; i < 3; i++) world.add(s.tube([[xs[i], gy + 0.5, z], [(xs[i] + xs[i + 1]) / 2, gy + 0.36, z + 0.03], [xs[i + 1], gy + 0.5, z]], 0.02, s.material('#d9cba0', { roughness: 0.9 })));
        const sign = s.label('NO TOCAR', 0.8, 0.3, [side * rx * 0.48, gy + 0.72, z + 0.06], '#f3efe2', '#7a4a2a'); sign.rotation.x = -0.2; world.add(sign);
      } else if (a.foot === 'figure') {
        const person = new THREE.Group();
        const coat = new THREE.MeshStandardMaterial({ color: mood.cheer > 0.5 ? '#d9442f' : '#3f5f8a', roughness: 0.8 });
        add(new THREE.Mesh(new THREE.CapsuleGeometry(0.2, 0.55, 4, 10), coat), person).position.y = 1.1;
        for (const sgn of [-1, 1]) add(new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.07, 0.75, 8), new THREE.MeshStandardMaterial({ color: '#2e3138', roughness: 0.9 })), person).position.set(sgn * 0.1, 0.38, 0);
        add(new THREE.Mesh(new THREE.SphereGeometry(0.13, 12, 10), new THREE.MeshStandardMaterial({ color: '#c99774', roughness: 0.8 })), person).position.y = 1.67;
        add(new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.22, 0.03, 14), new THREE.MeshStandardMaterial({ color: '#e6d9a8', roughness: 0.9 })), person).position.y = 1.78;
        person.position.set(-side * (span / 2 + 0.95), gy - 0.1, ahu ? 2.8 : 0.75); person.rotation.y = side * 0.7 + Math.PI;
        world.add(person);
      } else if (a.foot === 'tools') {
        const dark = new THREE.MeshStandardMaterial({ color: '#3c3d40', roughness: 0.9 });
        for (let i = 0; i < 5; i++) {
          const pick = add(new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.42, 5), dark));
          pick.position.set((random() - 0.5) * 2.2, gy + 0.05, (ahu ? 2.6 : 0.75) + random() * 0.45); pick.rotation.set(Math.PI / 2 - 0.1, 0, random() * 6);
        }
        const chips = new THREE.InstancedMesh(new THREE.TetrahedronGeometry(0.07), plain, 60);
        for (let i = 0; i < 60; i++) { e.set(random() * 6, random() * 6, 0); m.compose(new THREE.Vector3((random() - 0.5) * 2.6, gy, (ahu ? 2.5 : 0.7) + random() * 0.6), q.setFromEuler(e), new THREE.Vector3(1, 1, 1).multiplyScalar(0.5 + random())); chips.setMatrixAt(i, m); }
        add(chips);
      }
    }
    const small = souvenir || context.scale === 'tabletop' || context.scale === 'macro' || context.scale === 'room';
    if (small) world.scale.setScalar(souvenir ? 0.05 : 0.07);
    if (souvenir) world.position.y = 0.35 * 0.05;
    const k = small ? (souvenir ? 0.05 : 0.07) : 1;
    return { object: s.root, footprint: (souvenir ? 1.0 + span / 2 : Math.max(rx0, rz0)) * k, dispose: () => disposeTree(s.root) };
  },
});
