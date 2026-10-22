import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix } from '@conjure/kit';
import { bell, bustForm, fbm, headForm, noise3, ramp } from './head';

const TAGS = {
  lot: 'LOT 47', keep: 'DO NOT REMOVE', unveil: 'UNVEIL AT NOON', condemned: 'CONDEMNED', returned: 'RETURN TO DONOR', query: 'WHO ?',
} as const;

export default defineThing({
  questions: {
    shows: choice('How much of the bust shows?', {
      shrouded: 'Nothing: fully shrouded to below the pedestal top, only a head-and-shoulders shape.',
      shoulder: 'The sheet has slipped off one side, baring a shoulder and the pedestal beneath it.',
      face: 'The sheet has been pulled back off the face alone, like a hood.',
      veil: 'A short sheet that covers only head and shoulders like a veil, the pedestal standing bare.',
    }),
    who: choice('Who is under there?', {
      founder: 'A stern bearded founder with a bald crown.',
      lady: 'A lady with her hair drawn back into a heavy bun.',
      officer: 'A military man in a peaked cap, the brim pushing the cloth out.',
      child: 'A child, small-headed and narrow-shouldered.',
    }),
    sheet: choice('What is it covered with?', {
      linen: 'A white linen dust sheet.',
      dropcloth: 'A grey decorator\'s drop cloth spattered with old paint.',
      velvet: 'A deep red velvet cloth, ceremonial.',
      plastic: 'Clear plastic sheeting, the bust a blurred ghost inside it.',
    }),
    stone: choice('What is the bust made of, where it can be seen?', {
      marble: 'White marble.', bronze: 'Dark bronze.', granite: 'Polished black granite.',
    }),
    why: choice('Why is it covered?', {
      storage: 'In storage: parked on a pallet beside a cardboard box, dust settling on the folds.',
      unveiling: 'Awaiting unveiling: a tasselled pull-cord hangs ready and a red rope on brass posts keeps people back.',
      shame: 'Covered out of shame: red paint thrown across it and the name plate unscrewed from the pedestal.',
      moving: 'On its way out: strapped to a hand truck.',
    }),
    tag: choice('What does the tag on the cord say?', {
      lot: 'An auction lot number.', keep: 'DO NOT REMOVE.', unveil: 'The time of the unveiling.', condemned: 'CONDEMNED.', returned: 'RETURN TO DONOR.', query: 'Just a question: WHO ?',
    }),
    cord: choice('How is the cord tied?', {
      loose: 'One loose loop round the neck with a bow.',
      wound: 'Wound round and round, the neck in a thick coil, as if it might get out.',
      slipping: 'Slack and half undone, sagging down over one shoulder.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const seed = context.seed, sd = (seed % 977) * 1.37;
    const child = a.who === 'child';
    const size = child ? 0.1 : 0.125, broad = child ? 0.8 : a.who === 'lady' ? 0.9 : 1.05;
    const pedestalH = 1.02, half = 0.17;
    const Y0 = pedestalH + 0.03 + 2.85 * size; // head centre
    const side = random() < 0.5 ? -1 : 1;
    const plastic = a.sheet === 'plastic';
    const stone = { marble: { base: '#ece7dc', cavity: '#a79d8b', rough: 0.45, metal: 0 }, bronze: { base: '#5f4326', cavity: '#3d8d78', rough: 0.4, metal: 0.7 }, granite: { base: '#2f3134', cavity: '#151617', rough: 0.3, metal: 0.1 } }[a.stone];
    const wrap = (x: number) => Math.atan2(Math.sin(x), Math.cos(x));

    // The pedestal and what stands around it.
    const pedestal = s.material(a.why === 'storage' ? '#cfcabd' : '#e4dfd2', { roughness: 0.7 });
    s.box([half * 2, pedestalH - 0.1, half * 2], [0, pedestalH / 2 + 0.05, 0], pedestal);
    s.box([half * 2 + 0.06, 0.1, half * 2 + 0.06], [0, 0.05, 0], pedestal);
    s.box([half * 2 + 0.04, 0.05, half * 2 + 0.04], [0, pedestalH - 0.025, 0], pedestal);
    s.box([0.2, 0.03, 0.2], [0, pedestalH + 0.015, -0.012], pedestal);
    if (a.why === 'shame') {
      s.box([0.2, 0.08, 0.004], [0, pedestalH - 0.3, half + 0.002], s.material('#a9a394'));
      for (const x of [-0.085, 0.085]) for (const y of [-0.028, 0.028]) s.cylinder(0.005, 0.005, 0.006, [x, pedestalH - 0.3 + y, half + 0.004], s.material('#3a3835'), 6).rotation.x = Math.PI / 2;
    } else s.label(a.why === 'unveiling' ? '· · ·' : 'No. ' + (100 + Math.floor(random() * 800)), 0.2, 0.07, [0, pedestalH - 0.3, half + 0.003], '#4a4338', '#b9a56a');

    // The bust itself, only where it might be seen.
    const reveal = a.shows !== 'shrouded' || plastic;
    if (reveal) {
      const material = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: stone.rough, metalness: stone.metal });
      const plain = new THREE.MeshStandardMaterial({ color: stone.base, roughness: stone.rough, metalness: stone.metal });
      const tints = { base: stone.base, cavity: stone.cavity, cavityAmount: 0.8 };
      const head = headForm({
        size, seed, ...tints, res: 0.8, eyes: 'blank', smile: -0.15,
        ...(a.who === 'founder' ? { beard: 1, moustache: 1, brow: 1.4, jaw: 0.7 } : a.who === 'lady' ? { hair: 'parted' as const, jaw: 0.3, brow: 0.7 } : a.who === 'officer' ? { moustache: 1, jaw: 0.9, brow: 1.2 } : { hair: 'curls' as const, jaw: 0.25, brow: 0.5, nose: 0.75, crisp: 0.9 }),
      });
      const group = new THREE.Group();
      group.position.y = Y0;
      const add = (geometry: THREE.BufferGeometry, mat: THREE.Material, x = 0, y = 0, z = 0) => { const mesh = new THREE.Mesh(geometry, mat); mesh.position.set(x, y, z); mesh.castShadow = mesh.receiveShadow = true; group.add(mesh); return mesh; };
      add(head.geometry, material);
      add(bustForm({ size, seed, ...tints, broad }), material);
      if (a.who === 'lady') add(new THREE.SphereGeometry(0.36 * size, 14, 10), plain, 0, 0.15 * size, -1.0 * size);
      if (a.who === 'officer') {
        add(new THREE.CylinderGeometry(0.98 * size, 0.8 * size, 0.42 * size, 24), plain, 0, 0.95 * size, -0.06 * size).rotation.x = -0.08;
        add(new THREE.CylinderGeometry(0.8 * size, 0.82 * size, 0.24 * size, 24), plain, 0, 0.66 * size, -0.04 * size);
        const brim = add(new THREE.CylinderGeometry(0.62 * size, 0.62 * size, 0.05 * size, 20, 1, false, -1.2, 2.4), plain, 0, 0.56 * size, 0.42 * size);
        brim.rotation.x = 0.3;
      }
      s.root.add(group);
    }

    // The sheet: a taut hull over head, shoulders and pedestal, cinched by the cord, then hanging in folds.
    const floorY = a.why === 'unveiling' ? 0.03 : mix(0.16, 0.42, random());
    const hem = (az: number) => {
      const ragged = 0.07 * Math.sin(az * 3 + sd) + 0.05 * Math.sin(az * 7 + sd * 2);
      if (a.shows === 'veil') return Y0 - 2.55 * size + ragged * 0.8;
      let y = floorY + ragged + 0.05;
      if (a.shows === 'shoulder') y = mix(y, Y0 - 1.25 * size, ramp(1.25, 0.45, Math.abs(wrap(az - side * 1.45))));
      return y;
    };
    const support = (az: number, y: number) => {
      const sx = Math.sin(az), cz = Math.cos(az);
      const h = (y - Y0) / size;
      let r = 0;
      if (h > -1.12 && h < 1.1) {
        const k = Math.sqrt(Math.max(0, 1 - (h / 1.1) ** 2));
        r = k / Math.hypot(sx / 0.84, cz / (cz > 0 ? 0.88 : 1.02));
        r += 0.3 * bell(az > Math.PI ? az - Math.PI * 2 : az, 0.2) * bell(h + 0.2, 0.14) + 0.07 * bell(wrap(az), 0.5) * bell(h - 0.27, 0.08);
        if (a.who === 'founder') r += 0.3 * bell(wrap(az), 0.6) * bell(h + 0.95, 0.25);
        if (a.who === 'lady') r += 0.42 * bell(wrap(az - Math.PI), 0.42) * bell(h - 0.15, 0.3);
      }
      if (a.who === 'officer') {
        if (h > 0.5 && h < 1.3) r = Math.max(r, 1.1);
        r = Math.max(r, 1.12 * bell(wrap(az), 0.55) * bell(h - 0.56, 0.05));
      }
      if (a.who === 'founder' && h <= -1.12 && h > -1.5) r = Math.max(r, 0.5 * bell(wrap(az), 0.6));
      if (h < -0.5 && h > -1.5) r = Math.max(r, 0.5);
      if (h <= -1.45 && h > -2.85) {
        const t = ramp(-1.45, -1.85, h) * ramp(-2.85, -2.3, h);
        const sq = 1 / Math.pow(Math.pow(Math.abs(sx), 2.6) + Math.pow(Math.abs(cz), 2.6), 1 / 2.6);
        r = Math.max(r, t * sq / Math.hypot(sx / (1.36 * broad), cz / 0.86) + 0.1);
      }
      r *= size;
      if (y < pedestalH + 0.05) r = Math.max(r, (half + 0.045) / Math.max(Math.abs(sx), Math.abs(cz)));
      return r + 0.012;
    };

    const nu = 120, nv = 84, M = 90;
    const top = Y0 + (a.who === 'officer' ? 1.38 : 1.13) * size;
    const tight = { loose: 0.7, wound: 0.92, slipping: 0.35 }[a.cord];
    const neckY = Y0 - 1.16 * size;
    const position = new Float32Array((nu + 1) * (nv + 1) * 3), colour = new Float32Array((nu + 1) * (nv + 1) * 3);
    const radii: number[] = [], gone = new Uint8Array((nu + 1) * (nv + 1));
    const cloth = {
      linen: ['#efece4', '#b9b5aa'], dropcloth: ['#b9b6ac', '#85827a'], velvet: ['#7d1420', '#55101a'], plastic: ['#e9f1f4', '#c9d6dc'],
    }[a.sheet].map((hex) => new THREE.Color(hex));
    const dust = new THREE.Color('#9b968a'), red = new THREE.Color('#b3131b');
    const spatter = ['#3d6f9e', '#e9e4d2', '#c9582f', '#587a4b', '#e2b93b'].map((hex) => new THREE.Color(hex));
    const tint = new THREE.Color();
    const ys = new Float32Array(M + 1), rs = new Float32Array(M + 1);
    for (let i = 0; i <= nu; i++) {
      const az = (i / nu) * Math.PI * 2, end = hem(az);
      // Taut hull of the supports in this direction.
      const stack: number[] = [];
      for (let m = 0; m <= M; m++) {
        ys[m] = mix(top, end, m / M);
        rs[m] = m === 0 ? 0.001 : support(az, ys[m]);
        if (m === M && end < pedestalH) rs[m] = Math.max(rs[m], (half + 0.03) * 1.25, Math.max(...rs.subarray(0, M)) * 0.8);
        while (stack.length >= 2) {
          const p = stack[stack.length - 2], q = stack[stack.length - 1];
          if ((rs[q] - rs[p]) * (ys[m] - ys[p]) - (rs[m] - rs[p]) * (ys[q] - ys[p]) >= 0) stack.pop(); else break;
        }
        stack.push(m);
      }
      let seg = 0;
      for (let j = 0; j <= nv; j++) {
        const y = mix(top, end, j / nv);
        while (seg < stack.length - 2 && ys[stack[seg + 1]] > y) seg++;
        const p = stack[seg], q = stack[seg + 1];
        let r = mix(rs[p], rs[q], (ys[p] - y) / Math.max(1e-6, ys[p] - ys[q]));
        // The cord pulls the cloth in at the neck.
        const pinch = tight * bell(y - neckY, 0.2 * size + (a.cord === 'wound' ? 0.12 * size : 0));
        r = mix(r, Math.max(support(az, y), 0.56 * size), pinch);
        const hang = ramp(Y0 - 1.9 * size, Y0 - 4.5 * size, y), gather = bell(y - neckY, 0.45 * size);
        const wave = Math.sin(az * 9 + Math.sin(az * 2 + sd) * 2.2 + y * 2) * 0.6 + Math.sin(az * 17 + sd + y * 5) * 0.4;
        const crumple = fbm(Math.sin(az) * 3 + sd, y * 9, Math.cos(az) * 3) - 0.5;
        r += (hang * 0.04 + gather * tight * 0.012) * (wave + 0.9) + 0.02 * (crumple + 0.25) * (0.3 + hang);
        if (j === 0) r = 0;
        const k = i + j * (nu + 1);
        position[k * 3] = Math.sin(az) * r; position[k * 3 + 1] = y; position[k * 3 + 2] = Math.cos(az) * r - (y > Y0 - 1.3 * size ? 0.04 * size : 0.04 * size + ramp(Y0 - 1.3 * size, Y0 - 2 * size, y) * 0.08 * size * ramp(pedestalH - 0.2, pedestalH + 0.1, y));
        radii[k] = r;
        if (a.shows === 'face') {
          const f = wrap(az);
          const h = (y - Y0) / size;
          if ((f / 0.85) ** 2 + ((h + 0.12) / 0.92) ** 2 < 1) gone[k] = 1;
        }
        tint.copy(cloth[0]).lerp(cloth[1], Math.min(1, Math.max(0, -wave) * (hang * 0.8 + gather * 0.5) + Math.max(0, -crumple) * 1.2));
        tint.lerp(dust, ((a.why === 'storage' ? 0.22 : 0.03) + mood.wear * 0.3 * ramp(0.45, 0.7, fbm(Math.sin(az) * 2, y * 3 + sd, Math.cos(az) * 2))) * (a.sheet === 'velvet' ? 0.4 : 1));
        if (a.sheet === 'dropcloth') {
          const n = noise3(Math.sin(az) * 9 + sd, y * 16, Math.cos(az) * 9);
          if (n > 0.8) tint.lerp(spatter[Math.floor(noise3(Math.sin(az) * 3, y * 5 + sd, Math.cos(az) * 3) * 4.99)], 0.75);
        }
        if (a.why === 'shame') {
          const splash = fbm(Math.sin(az - side) * 1.6 + sd, y * 2.2, Math.cos(az - side) * 1.6) + 0.3 * bell(wrap(az - side * 0.5), 0.8) * ramp(Y0 - 5 * size, Y0, y);
          if (splash > 0.68) tint.lerp(red, 0.92);
          else if (splash > 0.58 && Math.sin(az * 40) > 0.7) tint.lerp(red, 0.9);
        }
        tint.toArray(colour, k * 3);
      }
    }
    const index: number[] = [];
    for (let j = 0; j < nv; j++)
      for (let i = 0; i < nu; i++) {
        const k = i + j * (nu + 1);
        if (gone[k] || gone[k + 1] || gone[k + nu + 1] || gone[k + nu + 2]) continue;
        index.push(k, k + nu + 1, k + 1, k + 1, k + nu + 1, k + nu + 2);
      }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(position, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colour, 3));
    geometry.setIndex(index);
    geometry.computeVertexNormals();
    const normal = geometry.attributes.normal as THREE.BufferAttribute;
    for (let j = 0; j <= nv; j++) {
      const k0 = j * (nu + 1), k1 = k0 + nu;
      const n = new THREE.Vector3().fromBufferAttribute(normal, k0).add(new THREE.Vector3().fromBufferAttribute(normal, k1)).normalize();
      normal.setXYZ(k0, n.x, n.y, n.z); normal.setXYZ(k1, n.x, n.y, n.z);
    }
    const sheetMaterial = plastic
      ? new THREE.MeshPhysicalMaterial({ vertexColors: true, transparent: true, opacity: 0.42, roughness: 0.12, side: THREE.DoubleSide, depthWrite: false })
      : new THREE.MeshStandardMaterial({ vertexColors: true, roughness: a.sheet === 'velvet' ? 0.95 : 0.85, side: THREE.DoubleSide });
    s.mesh(geometry, sheetMaterial);
    const at = (az: number, y: number, out = 0) => {
      const i = Math.round(((az % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2)) / (Math.PI * 2) * nu);
      const end = hem(az);
      const j = Math.min(nv, Math.max(0, Math.round((top - y) / (top - end) * nv)));
      const k = i + j * (nu + 1);
      const r = radii[k] + out;
      return [Math.sin(az) * r, position[k * 3 + 1], position[k * 3 + 2] + Math.cos(az) * out] as [number, number, number];
    };
    if (a.shows === 'face') {
      // A rolled edge where the cloth has been pushed back.
      const rim: [number, number, number][] = [];
      for (let i = 0; i < 28; i++) { const t = (i / 28) * Math.PI * 2; rim.push(at(Math.sin(t) * 0.9, Y0 + (-0.12 + Math.cos(t) * 0.98) * size, 0.006)); }
      s.tube(rim, 0.016, new THREE.MeshStandardMaterial({ color: cloth[0].clone().lerp(cloth[1], 0.25), roughness: 0.9 }), true);
    }

    // Cord, knot and tag.
    const rope = s.material(a.why === 'unveiling' ? '#c9a240' : '#b08d57', { roughness: 0.9 });
    const loops = a.cord === 'wound' ? 5 : 1;
    for (let l = 0; l < loops; l++) {
      const pts: [number, number, number][] = [];
      const base = neckY + (l - (loops - 1) / 2) * 0.13 * size;
      for (let i = 0; i < 24; i++) {
        const az = (i / 24) * Math.PI * 2;
        const sag = a.cord === 'slipping' ? -0.75 * size * (0.5 + 0.5 * Math.cos(az - side * 1.2)) : 0;
        pts.push(at(az, base + sag + Math.sin(az + l * 2) * 0.07 * size, 0.008));
      }
      s.tube(pts, 0.007, rope, true);
    }
    const knotAz = side * 0.55;
    const knotY = neckY + (a.cord === 'slipping' ? -0.75 * size * (0.5 + 0.5 * Math.cos(knotAz - side * 1.2)) : 0);
    const knot = at(knotAz, knotY, 0.016);
    s.ball([0.016, 0.014, 0.014], knot, rope, 10);
    for (const dx of [-1, 1]) {
      s.tube([knot, [knot[0] + dx * 0.035, knot[1] + 0.02, knot[2] + 0.012], [knot[0] + dx * 0.05, knot[1] - 0.015, knot[2] + 0.014], knot], 0.005, rope);
      s.rod(knot, [knot[0] + dx * 0.03, knot[1] - 0.11 - random() * 0.05, knot[2] + 0.02], 0.005, rope);
    }
    const tagAt: [number, number, number] = [knot[0] + side * 0.02, knot[1] - 0.2, knot[2] + 0.07];
    s.rod(knot, [tagAt[0], tagAt[1] + 0.045, tagAt[2]], 0.002, s.material('#6b5a40'));
    const tag = s.label(TAGS[a.tag], 0.2, 0.085, tagAt, a.tag === 'condemned' ? '#a3161c' : '#2d2a26', '#e9d9ae');
    tag.rotation.set(-0.1, knotAz * 0.6, (random() - 0.5) * 0.3);

    // Why it is covered.
    if (a.why === 'storage') {
      const wood = s.material('#b08a55', { roughness: 0.9 });
      for (let i = 0; i < 5; i++) s.box([0.14, 0.022, 0.8], [-0.4 + i * 0.2, -0.011 + 0.0, 0], wood).position.y = -0.011;
      for (const z of [-0.35, 0, 0.35]) s.box([0.94, 0.08, 0.09], [0, -0.062, z], wood);
      const card = s.material('#b58f5e', { roughness: 0.95 });
      const bx = -side * 0.33;
      s.box([0.26, 0.2, 0.3], [bx, 0.1, 0.2], card).rotation.y = 0.2;
      s.box([0.27, 0.004, 0.06], [bx, 0.202, 0.2], s.material('#d9cba6')).rotation.y = 0.2;
      for (const r of s.root.children) r.position.y += 0.102;
    } else if (a.why === 'unveiling') {
      const brass = s.material('#c9a240', { metalness: 0.85, roughness: 0.3 });
      const posts: [number, number, number][] = [[-0.55, 0, 0.62], [0.55, 0, 0.62]];
      for (const [x, , z] of posts) {
        s.cylinder(0.11, 0.12, 0.025, [x, 0.0125, z], brass, 20);
        s.cylinder(0.018, 0.018, 0.9, [x, 0.47, z], brass, 12);
        s.ball([0.035, 0.035, 0.035], [x, 0.94, z], brass, 12);
      }
      s.tube([[-0.55, 0.86, 0.62], [-0.28, 0.7, 0.64], [0, 0.64, 0.65], [0.28, 0.7, 0.64], [0.55, 0.86, 0.62]], 0.02, s.material('#a3182a', { roughness: 0.95 }));
      const pull = at(-side * 1.0, Y0 - 1.9 * size, 0.012);
      s.rod(pull, [pull[0] - side * 0.16, 0.75, pull[2] + 0.1], 0.006, rope);
      s.cylinder(0.008, 0.022, 0.09, [pull[0] - side * 0.16, 0.71, pull[2] + 0.1], rope, 10);
    } else if (a.why === 'moving') {
      const steel = s.material('#b3262b', { metalness: 0.4, roughness: 0.5 }), black = s.material('#1f1f1f', { roughness: 0.9 });
      const z = -half - 0.07;
      for (const x of [-0.19, 0.19]) {
        s.rod([x, 0.1, z], [x, 1.35, z - 0.03], 0.016, steel);
        const wheel = s.cylinder(0.12, 0.12, 0.05, [x * 1.35, 0.12, z - 0.05], black, 20); wheel.rotation.z = Math.PI / 2;
        s.cylinder(0.04, 0.04, 0.055, [x * 1.35, 0.12, z - 0.05], s.material('#c9c9c9', { metalness: 0.6 }), 12).rotation.z = Math.PI / 2;
      }
      for (const y of [0.35, 0.75, 1.15]) s.rod([-0.19, y, z - 0.01], [0.19, y, z - 0.01], 0.012, steel);
      s.tube([[-0.19, 1.35, z - 0.03], [-0.19, 1.45, z - 0.1], [0, 1.47, z - 0.13], [0.19, 1.45, z - 0.1], [0.19, 1.35, z - 0.03]], 0.016, steel);
      s.box([0.44, 0.012, 0.3], [0, 0.006, z + 0.17], steel);
      const strap = s.material('#e0b32e', { roughness: 0.8 });
      for (const y of [0.45, 0.85]) {
        const w = half + 0.012;
        s.box([w * 2, 0.045, 0.004], [0, y, w], strap); s.box([0.004, 0.045, w * 2 + 0.08], [w, y, -0.04], strap); s.box([0.004, 0.045, w * 2 + 0.08], [-w, y, -0.04], strap);
      }
    }
    return s.finish({ footprint: 0.45 });
  },
});
