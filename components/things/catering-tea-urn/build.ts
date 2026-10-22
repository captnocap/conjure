import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul, score } from '@conjure/kit';

type V3 = readonly [number, number, number];
type Inst = { p: V3; r?: V3; s?: V3; c?: THREE.ColorRepresentation };

function instances(s: Sculpture, geometry: THREE.BufferGeometry, material: THREE.Material, list: Inst[]) {
  const mesh = new THREE.InstancedMesh(geometry, material, Math.max(list.length, 1));
  mesh.count = list.length;
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), v = new THREE.Vector3(), sc = new THREE.Vector3();
  list.forEach((it, i) => {
    const r = it.r ?? [0, 0, 0], k = it.s ?? [1, 1, 1];
    q.setFromEuler(e.set(r[0], r[1], r[2], 'YXZ'));
    m.compose(v.set(it.p[0], it.p[1], it.p[2]), q, sc.set(k[0], k[1], k[2]));
    mesh.setMatrixAt(i, m);
    mesh.setColorAt(i, new THREE.Color(it.c ?? '#ffffff'));
  });
  mesh.castShadow = mesh.receiveShadow = true;
  mesh.frustumCulled = false;
  s.root.add(mesh);
  return mesh;
}

function skirt(L: number, W: number, top: number, drop: number, ripple: number, phase: number) {
  const per = 2 * (L + W), n = 160, rows = 4;
  const pos: number[] = [], idx: number[] = [];
  for (let i = 0; i <= n; i++) {
    const d = ((i % n) / n) * per;
    let x: number, z: number, nx: number, nz: number;
    if (d < L) { x = -L / 2 + d; z = W / 2; nx = 0; nz = 1; }
    else if (d < L + W) { x = L / 2; z = W / 2 - (d - L); nx = 1; nz = 0; }
    else if (d < 2 * L + W) { x = L / 2 - (d - L - W); z = -W / 2; nx = 0; nz = -1; }
    else { x = -L / 2; z = -W / 2 + (d - 2 * L - W); nx = -1; nz = 0; }
    for (let r = 0; r <= rows; r++) {
      const t = r / rows;
      const off = 0.006 + ripple * t * (0.5 + 0.5 * Math.sin(d * 23 + phase + Math.sin(d * 5.3) * 1.4));
      pos.push(x + nx * off, top - drop * t * (1 + 0.04 * Math.sin(d * 3.1 + phase)), z + nz * off);
    }
  }
  for (let i = 0; i < n; i++) for (let r = 0; r < rows; r++) {
    const a = i * (rows + 1) + r, b = a + rows + 1;
    idx.push(a, a + 1, b, b, a + 1, b + 1);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

const SIGNS = { none: '', help: 'PLEASE HELP YOURSELF', price: 'TEA 50p', hot: 'CAUTION: VERY HOT', both: 'TEA / COFFEE', donations: 'DONATIONS WELCOME' } as const;

export default defineThing({
  questions: {
    urn: choice('What is the hot water kept in?', {
      steel: 'A polished stainless catering urn with black handles, a lever tap and a sight glass.',
      enamel: 'An old cream enamel urn with green bands, older than most of the committee.',
      samovar: 'A brass samovar with a little teapot keeping warm on its crown.',
      airpots: 'A pair of pump-action flasks, one for tea and one for coffee.',
      teapot: 'One enormous aluminium catering teapot with two handles, already brewed and stewing.',
    }),
    stand: choice('What does it stand on?', {
      cloth: 'A small table under a white cloth.',
      folding: 'A bare laminate folding table on steel legs.',
      trolley: 'A two-tier steel tea trolley on castors, ready to be wheeled round.',
      counter: 'A length of kitchen worktop over cupboard doors.',
    }),
    cups: choice('What do people drink from?', {
      green: 'Thick pale-green institutional cups and saucers, the kind every hall owns two hundred of.',
      white: 'Plain white catering cups and saucers.',
      china: 'Best bone china in mixed pastels, brought out for the occasion.',
      mugs: 'A jumble of mismatched mugs from the cupboard.',
      paper: 'Tall stacks of disposable cups.',
    }),
    used: score('How far through the tea are they?', [
      'Every cup still ranked and waiting, nobody has arrived',
      'A few cups taken',
      'Half gone, dirty ones coming back',
      'Nearly all used, the urn almost dry, dirty cups piled up',
    ]),
    hot: noul('Is it switched on and steaming?'),
    pouring: noul('Has a cup just been filled and left under the tap?'),
    sign: choice('If there is a hand-written notice taped to the front, what does it say?', {
      none: 'No notice.',
      help: 'PLEASE HELP YOURSELF',
      price: 'TEA 50p',
      hot: 'CAUTION: VERY HOT',
      both: 'TEA / COFFEE',
      donations: 'DONATIONS WELCOME',
    }),
    extras: choice('What else is on the table?', {
      none: 'Only the tea things.',
      biscuits: 'A plate of plain biscuits.',
      supplies: 'A catering box of tea bags and a big jar of instant coffee.',
      donations: 'A saucer of coins and a folded note.',
      teatowel: 'A checked tea towel draped over the edge, someone has been washing up as they go.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const rnd = (lo: number, hi: number) => lo + (hi - lo) * random();
    const pick = <T,>(list: readonly T[]) => list[Math.floor(random() * list.length)];
    const u = a.used;
    const HX = 0.6, HZ = 0.3;
    const T = { cloth: 0.74, folding: 0.74, trolley: 0.8, counter: 0.9 }[a.stand];

    const steel = s.material('#cfd5d8', { metalness: 0.35, roughness: 0.3 });
    const chrome = s.material('#e6eaec', { metalness: 0.4, roughness: 0.2 });
    const black = s.material('#1f2022', { roughness: 0.5 });
    const boxes: Inst[] = [], discs: Inst[] = [], cupsI: Inst[] = [], handles: Inst[] = [];
    const box = (p: V3, size: V3, c: THREE.ColorRepresentation, r?: V3) => boxes.push({ p, s: size, c, r });
    const disc = (p: V3, radius: number, h: number, c: THREE.ColorRepresentation, r?: V3) => discs.push({ p, s: [radius, h, radius], c, r });

    // ---- the stand ----
    if (a.stand === 'cloth') {
      const cloth = s.material(new THREE.Color('#f4f1e8').lerp(new THREE.Color('#ffe7c2'), Math.max(0, mood.warmth - 0.5) * 0.4), { roughness: 0.9, side: THREE.DoubleSide });
      s.box([HX * 2 + 0.012, 0.016, HZ * 2 + 0.012], [0, T - 0.008, 0], cloth);
      s.mesh(skirt(HX * 2, HZ * 2, T - 0.002, rnd(0.3, 0.5), 0.03, rnd(0, 6)), cloth);
      const leg = s.material('#6a5038');
      for (const x of [-1, 1]) for (const z of [-1, 1]) s.box([0.045, T - 0.02, 0.045], [x * (HX - 0.05), (T - 0.02) / 2, z * (HZ - 0.05)], leg);
    } else if (a.stand === 'folding') {
      s.box([HX * 2, 0.022, HZ * 2], [0, T - 0.011, 0], s.material(pick(['#d9cbb0', '#c9d2cf', '#e3d9c2']), { roughness: 0.4 }));
      s.box([HX * 2 + 0.008, 0.016, HZ * 2 + 0.008], [0, T - 0.016, 0], black);
      for (const x of [-1, 1]) {
        for (const z of [-1, 1]) s.rod([x * (HX - 0.1), 0, z * (HZ - 0.04)], [x * (HX - 0.1), T - 0.025, z * (HZ - 0.04)], 0.013, steel);
        s.rod([x * (HX - 0.1), 0.015, -HZ + 0.04], [x * (HX - 0.1), 0.015, HZ - 0.04], 0.013, steel);
        s.rod([x * (HX - 0.1), 0.4, 0], [x * (HX - 0.38), T - 0.03, 0], 0.008, steel);
        s.rod([x * (HX - 0.1), 0.4, -HZ + 0.04], [x * (HX - 0.1), 0.4, HZ - 0.04], 0.008, steel);
      }
    } else if (a.stand === 'trolley') {
      for (const y of [T, 0.3]) {
        s.box([HX * 2, 0.014, HZ * 2], [0, y - 0.007, 0], steel);
        for (const z of [-1, 1]) s.box([HX * 2, 0.035, 0.008], [0, y + 0.01, z * HZ], chrome);
        for (const x of [-1, 1]) s.box([0.008, 0.035, HZ * 2], [x * HX, y + 0.01, 0], chrome);
      }
      for (const x of [-1, 1]) for (const z of [-1, 1]) {
        s.rod([x * (HX - 0.01), 0.09, z * (HZ - 0.01)], [x * (HX - 0.01), T + 0.02, z * (HZ - 0.01)], 0.012, chrome);
        const wheel = s.cylinder(0.045, 0.045, 0.028, [x * (HX - 0.01) + 0.015, 0.045, z * (HZ - 0.01)], black, 14);
        wheel.rotation.x = Math.PI / 2; wheel.rotation.z = rnd(-0.6, 0.6);
      }
      s.tube([[-HX, T, -HZ], [-HX - 0.1, T + 0.1, -HZ], [-HX - 0.1, T + 0.1, HZ], [-HX, T, HZ]], 0.011, chrome);
      // Spare crockery on the lower shelf.
      for (let i = 0; i < 3; i++) { const h = rnd(0.05, 0.14); disc([-0.35 + i * 0.16, 0.3 + h / 2, rnd(-0.08, 0.08)], 0.07, h, '#f1efe8'); }
      box([0.3, 0.37, 0], [0.3, 0.14, 0.22], '#b89464', [0, rnd(-0.2, 0.2), 0]);
    } else {
      const face = s.material(pick(['#e9e3d2', '#cfd8d2', '#d8c9a8', '#f0eeea']));
      s.box([HX * 2 - 0.02, T - 0.14, HZ * 2 - 0.04], [0, 0.1 + (T - 0.14) / 2, -0.01], face);
      s.box([HX * 2 - 0.08, 0.1, HZ * 2 - 0.12], [0, 0.05, -0.03], black);
      for (const x of [-1, 1]) {
        s.box([HX - 0.04, T - 0.2, 0.018], [x * (HX / 2 - 0.006), 0.13 + (T - 0.2) / 2, HZ - 0.022], s.material(new THREE.Color(face.color).multiplyScalar(0.94)));
        s.box([0.016, 0.12, 0.022], [x * 0.05, T - 0.24, HZ - 0.005], chrome);
      }
      s.box([HX * 2 + 0.03, 0.036, HZ * 2 + 0.03], [0, T - 0.018, 0], s.material(pick(['#8b9a8f', '#5a5450', '#b99b6c', '#c8c2b4']), { roughness: 0.35 }));
    }

    // ---- the urn ----
    const ux = a.urn === 'airpots' ? 0.3 : 0.33, uz = -0.08;
    const U = (x: number, y: number, z: number): V3 => [ux + x, T + y, uz + z];
    const level = mix(1, 0.08, u);
    const steamAt: V3[] = [];
    let tap: V3 | null = null;
    const sight = (x: number, z: number, y0: number, y1: number) => {
      s.rod(U(x, y0, z), U(x, y1, z), 0.008, s.material('#eef4f4', { roughness: 0.1 }));
      s.rod(U(x, y0, z), U(x, y0 + (y1 - y0) * level, z), 0.0095, s.material('#a8601f', { roughness: 0.2, emissive: '#5a2a08', emissiveIntensity: 0.4 }));
      for (const y of [y0, y1]) s.box([0.026, 0.016, 0.03], U(x, y, z - 0.008), chrome);
    };
    const leverTap = (y: number, r: number, metal: THREE.Material) => {
      s.rod(U(0, y, r - 0.01), U(0, y, r + 0.075), 0.013, metal);
      s.rod(U(0, y + 0.005, r + 0.062), U(0, y - 0.045, r + 0.062), 0.011, metal, 0.008);
      const lever = s.box([0.022, 0.06, 0.022], U(0, y + 0.04, r + 0.062), black);
      lever.rotation.x = a.pouring ? 0.9 : 0.15;
      tap = U(0, y - 0.045, r + 0.062);
    };
    if (a.urn === 'steel') {
      for (let i = 0; i < 3; i++) s.cylinder(0.018, 0.022, 0.02, U(Math.cos(i * 2.094 + 0.5) * 0.12, 0.01, Math.sin(i * 2.094 + 0.5) * 0.12), black, 10);
      s.cylinder(0.15, 0.156, 0.055, U(0, 0.047, 0), black, 32);
      s.cylinder(0.143, 0.143, 0.4, U(0, 0.275, 0), steel, 36);
      for (const y of [0.1, 0.45]) s.cylinder(0.147, 0.147, 0.01, U(0, y, 0), chrome, 36);
      s.lathe([[0.001, 0.05], [0.03, 0.05], [0.1, 0.03], [0.147, 0.006], [0.147, 0]], steel, U(0, 0.475, 0));
      s.cylinder(0.02, 0.026, 0.035, U(0, 0.54, 0), black, 14);
      for (const x of [-1, 1]) s.box([0.035, 0.06, 0.085], U(x * 0.16, 0.4, 0), black);
      leverTap(0.11, 0.143, chrome);
      sight(0.075, 0.127, 0.12, 0.43);
      disc(U(-0.07, 0.047, 0.151), 0.011, 0.012, a.hot ? '#ff3b2a' : '#5a1a16', [Math.PI / 2, 0, 0]);
      steamAt.push(U(0.05, 0.52, 0));
    } else if (a.urn === 'enamel') {
      const cream = s.material('#efe6cc', { roughness: 0.3 }), green = s.material('#2f6b4a', { roughness: 0.35 });
      for (let i = 0; i < 3; i++) s.rod(U(Math.cos(i * 2.094 + 0.5) * 0.11, 0, Math.sin(i * 2.094 + 0.5) * 0.11), U(Math.cos(i * 2.094 + 0.5) * 0.1, 0.06, Math.sin(i * 2.094 + 0.5) * 0.1), 0.014, black);
      s.lathe([[0.001, 0.05], [0.115, 0.05], [0.15, 0.1], [0.162, 0.26], [0.152, 0.42], [0.132, 0.47], [0.132, 0.48]], cream, U(0, 0, 0));
      for (const [y, r] of [[0.1, 0.152], [0.42, 0.154], [0.475, 0.134]] as const) { const band = s.ring(r, 0.008, U(0, y, 0), green); band.rotation.x = Math.PI / 2; }
      s.lathe([[0.001, 0.07], [0.02, 0.07], [0.03, 0.05], [0.09, 0.03], [0.135, 0.005], [0.135, 0]], cream, U(0, 0.48, 0));
      s.ball([0.022, 0.022, 0.022], U(0, 0.56, 0), green, 12);
      for (const x of [-1, 1]) { const h = s.ring(0.04, 0.009, U(x * 0.165, 0.36, 0), black, Math.PI); h.rotation.z = -x * Math.PI / 2; }
      leverTap(0.1, 0.148, s.material('#c2a14e', { metalness: 0.8, roughness: 0.3 }));
      sight(0.08, 0.14, 0.13, 0.4);
      if (mood.wear > 0.3) for (let i = 0; i < Math.round(mood.wear * 6); i++) { const t = rnd(0, 6.28); disc(U(Math.cos(t) * 0.158, rnd(0.12, 0.4), Math.sin(t) * 0.158), rnd(0.008, 0.02), 0.006, '#2a2624', [Math.PI / 2, Math.PI / 2 - t, 0]); }
      steamAt.push(U(0.04, 0.55, 0));
    } else if (a.urn === 'samovar') {
      const brass = s.material('#c79a3c', { metalness: 0.85, roughness: 0.25 });
      s.box([0.22, 0.02, 0.22], U(0, 0.01, 0), brass);
      s.lathe([[0.001, 0.02], [0.1, 0.02], [0.105, 0.04], [0.055, 0.07], [0.05, 0.1], [0.12, 0.15], [0.165, 0.27], [0.155, 0.38], [0.1, 0.44], [0.07, 0.46], [0.09, 0.49], [0.05, 0.52], [0.05, 0.57], [0.085, 0.59], [0.085, 0.6], [0.001, 0.6]], brass, U(0, 0, 0));
      s.ball([0.075, 0.062, 0.075], U(0, 0.66, 0), s.material(pick(['#f3efe4', '#2d4f8a', '#a8322c']), { roughness: 0.25 }), 16);
      s.rod(U(0.06, 0.65, 0), U(0.13, 0.7, 0), 0.012, s.material('#f3efe4'), 0.008);
      s.ball([0.016, 0.016, 0.016], U(0, 0.73, 0), brass, 10);
      for (const x of [-1, 1]) {
        s.rod(U(x * 0.15, 0.36, 0), U(x * 0.22, 0.36, 0), 0.008, brass);
        s.rod(U(x * 0.15, 0.24, 0), U(x * 0.22, 0.24, 0), 0.008, brass);
        s.rod(U(x * 0.22, 0.22, 0), U(x * 0.22, 0.38, 0), 0.016, s.material('#3b2a1c'));
      }
      leverTap(0.2, 0.15, brass);
      const key = s.ring(0.022, 0.006, U(0, 0.27, 0.212), brass); key.rotation.y = Math.PI / 2;
      steamAt.push(U(0, 0.74, 0));
    } else if (a.urn === 'airpots') {
      (['TEA', 'COFFEE'] as const).forEach((word, i) => {
        const x = (i - 0.5) * 0.24;
        const shell = i === 0 ? steel : s.material(pick(['#8c1d1d', '#23262a', '#b4bbbe']), { metalness: 0.4, roughness: 0.35 });
        s.cylinder(0.09, 0.094, 0.34, U(x, 0.17, 0), shell, 28);
        s.cylinder(0.094, 0.094, 0.07, U(x, 0.375, 0), black, 28);
        const pump = s.box([0.1, 0.02, 0.15], U(x, 0.425, -0.01), black); pump.rotation.x = -0.18;
        s.rod(U(x, 0.36, 0.08), U(x, 0.36, 0.15), 0.012, black);
        s.rod(U(x, 0.365, 0.145), U(x, 0.3, 0.145), 0.011, black, 0.008);
        const grip = s.ring(0.055, 0.009, U(x, 0.33, -0.09), black, Math.PI); grip.rotation.y = Math.PI / 2; grip.rotation.x = Math.PI / 2;
        s.label(word, 0.11, 0.045, U(x, 0.2, 0.094), '#22262a', '#f4efdc');
        steamAt.push(U(x, 0.33, 0.15));
      });
      tap = U(-0.12, 0.3, 0.145);
    } else {
      const alu = s.material('#cdd2d4', { metalness: 0.35, roughness: 0.42 });
      s.cylinder(0.11, 0.11, 0.012, U(0, 0.006, 0), s.material('#7a5a3c'), 20);
      s.lathe([[0.001, 0.012], [0.11, 0.012], [0.175, 0.07], [0.195, 0.16], [0.17, 0.26], [0.11, 0.3], [0.11, 0.31]], alu, U(0, 0, 0));
      s.lathe([[0.001, 0.05], [0.03, 0.045], [0.085, 0.022], [0.115, 0]], alu, U(0, 0.31, 0));
      s.ball([0.022, 0.018, 0.022], U(0, 0.372, 0), black, 12);
      s.tube([U(-0.15, 0.1, 0.06), U(-0.27, 0.16, 0.1), U(-0.33, 0.25, 0.12), U(-0.37, 0.3, 0.135)], 0.024, alu);
      const top = s.ring(0.13, 0.012, U(0, 0.3, 0), black, Math.PI); top.rotation.y = 0.35;
      const back = s.ring(0.075, 0.012, U(0.2, 0.17, -0.07), black, Math.PI); back.rotation.set(0, 0.35, -Math.PI / 2);
      steamAt.push(U(-0.38, 0.32, 0.14), U(0, 0.36, 0));
    }
    if (a.urn !== 'teapot' && a.urn !== 'airpots') s.tube([U(0, 0.03, -0.14), [ux + 0.05, T + 0.012, -HZ + 0.03], [ux + 0.07, T - 0.02, -HZ - 0.03], [ux + 0.08, T - 0.4, -HZ - 0.04]], 0.007, black);

    // ---- cups ----
    const cupColour = () => ({
      green: '#a9c7a7', white: '#f5f3ee',
      china: pick(['#f6dfe5', '#dfe9f4', '#f5eecf', '#e2f0dc', '#fbf9f4']),
      mugs: pick(['#c8412f', '#2f5d8a', '#e8c13a', '#3f7d55', '#f2efe8', '#6b4a8c', '#e98a3a', '#2c2c30']),
      paper: '#f7f6f2',
    })[a.cups];
    const tall = a.cups === 'mugs';
    const cupH = tall ? 0.092 : 0.062;
    const cup = (x: number, y: number, z: number, opts: { saucer?: boolean; tea?: number; colour?: string; tip?: boolean } = {}) => {
      const c = opts.colour ?? cupColour(), yaw = rnd(0, Math.PI * 2);
      let base = y;
      if (opts.saucer && !tall) { disc([x, y + 0.005, z], 0.07, 0.01, c); disc([x, y + 0.011, z], 0.045, 0.004, new THREE.Color(c).multiplyScalar(0.93)); base = y + 0.012; }
      if (opts.tip) {
        cupsI.push({ p: [x, base + 0.04, z], r: [Math.PI / 2, yaw, 0], s: [1, tall ? 1.45 : 1, 1], c });
        return;
      }
      cupsI.push({ p: [x, base, z], r: [0, yaw, 0], s: [1, tall ? 1.45 : 1, 1], c });
      handles.push({ p: [x + Math.cos(yaw) * (tall ? 0.05 : 0.052), base + cupH * 0.52, z - Math.sin(yaw) * (tall ? 0.05 : 0.052)], r: [0, yaw, 0], s: [1, tall ? 1.3 : 1, 1], c });
      if (opts.tea !== undefined) disc([x, base + cupH * opts.tea, z], tall ? 0.037 : 0.04, 0.004, opts.tea > 0.5 ? '#9a5b2a' : '#6b3d1c');
    };
    const cols = 3 + Math.round(mood.density * 2), rowsN = 3, pitch = tall ? 0.115 : 0.15;
    const gx0 = -HX + 0.085, gz0 = -0.06;
    let taken = 0;
    if (a.cups === 'paper') {
      const towers = 2 + Math.round(mood.density * 2);
      for (let t = 0; t < towers; t++) {
        const n = Math.max(1, Math.round(mix(16, 2, u) * rnd(0.6, 1.1)));
        const x = gx0 + t * 0.12 + rnd(-0.01, 0.01), z = gz0 + rnd(0, 0.12);
        for (let i = 0; i < n; i++) cupsI.push({ p: [x, T + i * 0.014, z], s: [0.9, 1.5, 0.9], c: i % 5 === 4 ? '#e9e7e0' : '#f7f6f2' });
      }
      taken = Math.round(u * 8);
      for (let i = 0; i < taken; i++) {
        const x = rnd(-HX + 0.08, 0.08), z = rnd(-HZ + 0.07, HZ - 0.07) ;
        if (random() < 0.5) cupsI.push({ p: [x, T + 0.036, z], r: [Math.PI / 2, rnd(0, 6), 0], s: [0.9, 1.5, 0.9], c: '#efede6' });
        else { cupsI.push({ p: [x, T, z], s: [0.9, 1.5, 0.9], c: '#f7f6f2' }); disc([x, T + 0.03, z], 0.03, 0.004, '#6b3d1c'); }
      }
    } else {
      const fit = Math.min(cols, Math.floor((ux - 0.2 - gx0) / pitch) + 1);
      for (let i = 0; i < fit; i++) for (let j = 0; j < rowsN; j++) {
        if (random() < u * 0.92) { taken++; continue; }
        cup(gx0 + i * pitch + rnd(-0.006, 0.006), T, gz0 + j * (tall ? 0.11 : 0.125) + rnd(-0.006, 0.006), { saucer: true });
      }
      // Dirty ones come back to the rear of the table, stacked or on their sides.
      const dirty = Math.round(taken * u * 0.8);
      let stackH = 0;
      for (let i = 0; i < dirty; i++) {
        const x = -HX + 0.09 + (i % 5) * 0.105 + rnd(-0.015, 0.015), z = -HZ + 0.075 + rnd(-0.01, 0.02);
        const layer = Math.floor(i / 5);
        if (layer > 1) { stackH++; continue; }
        cup(x, T + layer * cupH * 0.8, z, { tea: rnd(0.15, 0.4), tip: layer === 0 && random() < 0.15 });
      }
      const saucers = Math.round(taken * u * 0.5) + stackH;
      if (saucers > 0 && !tall) disc([0.08, T + saucers * 0.004, -HZ + 0.085], 0.07, saucers * 0.008, cupColour());
    }
    if (a.pouring) {
      const at: V3 = tap ?? [ux - 0.24, T + 0.06, uz + 0.2];
      if (a.cups === 'paper') { cupsI.push({ p: [at[0], T, at[2]], s: [0.9, 1.5, 0.9], c: '#f7f6f2' }); disc([at[0], T + 0.085, at[2]], 0.034, 0.004, '#9a5b2a'); }
      else cup(at[0], T, at[2], { saucer: true, tea: 0.85 });
      steamAt.push([at[0], T + 0.1, at[2]]);
    }

    // ---- milk, sugar, notice, extras ----
    const mx = ux - 0.21, mz = HZ - 0.085;
    if (a.cups === 'paper') {
      box([mx, T + 0.085, mz], [0.07, 0.17, 0.07], '#f4f4f0', [0, rnd(-0.4, 0.4), 0]);
      box([mx, T + 0.1, mz], [0.072, 0.05, 0.072], pick(['#2f6fb5', '#3c9a4e', '#c8342e']), [0, 0, 0]);
      box([HX - 0.1, T + 0.03, mz], [0.12, 0.06, 0.09], '#e9e2d0', [0, rnd(-0.3, 0.3), 0]);
      for (let i = 0; i < 8; i++) box([HX - 0.1 + rnd(-0.045, 0.045), T + 0.064, mz + rnd(-0.03, 0.03)], [0.045, 0.004, 0.022], pick(['#ffffff', '#f6e3a8', '#f4c6cf']), [0.2, rnd(0, 3), 0]);
    } else {
      const jugColour = a.cups === 'green' ? '#a9c7a7' : a.cups === 'china' ? '#fbf9f4' : pick(['#f5f3ee', '#dfe4e6']);
      const ware = s.material(jugColour, { roughness: 0.25, metalness: jugColour === '#dfe4e6' ? 0.8 : 0 });
      const jug = s.lathe([[0.001, 0], [0.04, 0], [0.052, 0.035], [0.05, 0.08], [0.036, 0.11], [0.044, 0.135], [0.04, 0.135], [0.03, 0.11], [0.001, 0.02]], ware, [mx, T, mz]);
      jug.scale.set(1, 1, 0.9);
      const grip = s.ring(0.032, 0.007, [mx - 0.05, T + 0.075, mz], ware, Math.PI); grip.rotation.z = Math.PI / 2;
      s.rod([mx + 0.036, T + 0.125, mz], [mx + 0.062, T + 0.14, mz], 0.014, ware, 0.006);
      s.cylinder(0.033, 0.033, 0.004, [mx, T + 0.02 + 0.08 * mix(1, 0.2, u), mz], s.material('#fffdf6'), 14);
      const sx = HX - 0.09;
      s.lathe([[0.001, 0], [0.035, 0], [0.058, 0.04], [0.06, 0.07], [0.054, 0.07], [0.05, 0.04], [0.001, 0.012]], ware, [sx, T, mz]);
      for (let i = 0; i < Math.round(mix(14, 3, u)); i++) box([sx + rnd(-0.03, 0.03), T + 0.05 + rnd(0, 0.03), mz + rnd(-0.03, 0.03)], [0.016, 0.016, 0.016], '#ffffff', [rnd(0, 1), rnd(0, 3), 0]);
      s.rod([sx + 0.01, T + 0.05, mz], [sx + 0.07, T + 0.13, mz + 0.03], 0.004, chrome);
    }
    if (a.sign !== 'none') {
      const note = s.label(SIGNS[a.sign], 0.42, 0.15, [rnd(-0.2, 0.05), T - 0.11, HZ + (a.stand === 'cloth' ? 0.05 : 0.022)], pick(['#1d2a5c', '#222222', '#a3241f']), '#fbf8ea');
      note.rotation.z = rnd(-0.06, 0.06);
      note.castShadow = false;
    }
    const ex = 0.14, ez = -HZ + 0.1;
    if (a.extras === 'biscuits') {
      disc([ex, T + 0.005, HZ - 0.1], 0.085, 0.01, '#f5f3ee');
      for (let i = 0; i < Math.round(mix(11, 2, u)); i++) { const t = i * 0.57; disc([ex + Math.cos(t) * 0.045, T + 0.018 + i * 0.001, HZ - 0.1 + Math.sin(t) * 0.045], 0.028, 0.009, pick(['#d2a55e', '#c9964c', '#e0bf86']), [0.25, -t, 0]); }
    } else if (a.extras === 'supplies') {
      box([ex - 0.02, T + 0.07, ez], [0.2, 0.14, 0.12], pick(['#c8342e', '#2f5d8a', '#3c8a4e']), [0, rnd(-0.2, 0.2), 0]);
      box([ex - 0.02, T + 0.075, ez + 0.062], [0.12, 0.06, 0.002], '#f6e9a8', [0, 0, 0]);
      disc([ex + 0.16, T + 0.075, ez + 0.02], 0.05, 0.15, '#4a2c1a');
      disc([ex + 0.16, T + 0.165, ez + 0.02], 0.052, 0.03, '#c8342e');
    } else if (a.extras === 'donations') {
      disc([ex, T + 0.005, HZ - 0.09], 0.07, 0.01, '#f5f3ee');
      for (let i = 0; i < 9; i++) disc([ex + rnd(-0.04, 0.04), T + 0.014 + i * 0.002, HZ - 0.09 + rnd(-0.04, 0.04)], rnd(0.01, 0.015), 0.003, pick(['#c9a23c', '#c8ccd0', '#b87a4a']));
      box([ex + 0.01, T + 0.022, HZ - 0.1], [0.07, 0.003, 0.04], '#7aa98a', [0.1, rnd(0, 3), 0]);
    } else if (a.extras === 'teatowel') {
      const towel = pick(['#c8342e', '#2f5d8a', '#3c8a4e']);
      box([-HX + 0.2, T + 0.004, HZ - 0.07], [0.22, 0.008, 0.14], '#f4f1e8');
      box([-HX + 0.2, T - 0.13, HZ + 0.012 + (a.stand === 'cloth' ? 0.04 : 0)], [0.22, 0.27, 0.008], '#f4f1e8');
      for (const dx of [-0.08, 0, 0.08]) box([-HX + 0.2 + dx, T - 0.13, HZ + 0.017 + (a.stand === 'cloth' ? 0.04 : 0)], [0.018, 0.27, 0.004], towel);
      for (const dy of [-0.04, -0.2]) box([-HX + 0.2, T + dy, HZ + 0.017 + (a.stand === 'cloth' ? 0.04 : 0)], [0.22, 0.018, 0.004], towel);
    }
    // Tea rings on a hard top once people have been through.
    if (a.stand !== 'cloth') for (let i = 0; i < Math.round((u + mood.wear) * 2.5); i++) disc([rnd(-HX + 0.1, HX - 0.1), T + 0.001, rnd(-HZ + 0.06, HZ - 0.06)], rnd(0.022, 0.03), 0.002, '#b9a88c');

    instances(s, new THREE.BoxGeometry(1, 1, 1), s.material('#ffffff', { roughness: 0.7 }), boxes);
    instances(s, new THREE.CylinderGeometry(1, 1, 1, 20), s.material('#ffffff', { roughness: 0.4 }), discs);
    const profile = a.cups === 'paper'
      ? [[0.001, 0.003], [0.026, 0.003], [0.027, 0], [0.04, 0.06], [0.042, 0.062], [0.038, 0.06]]
      : tall ? [[0.001, 0.004], [0.038, 0.004], [0.04, 0], [0.041, 0.064], [0.038, 0.064]]
        : [[0.001, 0.005], [0.024, 0.005], [0.026, 0], [0.03, 0.004], [0.046, 0.05], [0.048, 0.062], [0.045, 0.062]];
    instances(s, new THREE.LatheGeometry(profile.map(([x, y]) => new THREE.Vector2(x, y)), 18), s.material('#ffffff', { roughness: 0.3, side: THREE.DoubleSide }), cupsI);
    instances(s, new THREE.TorusGeometry(0.02, 0.006, 6, 14), s.material('#ffffff', { roughness: 0.3 }), handles);

    // ---- steam ----
    const puffs: { mesh: THREE.Mesh; origin: V3; phase: number; sway: number; material: THREE.MeshStandardMaterial }[] = [];
    if (a.hot) {
      const puffGeometry = new THREE.SphereGeometry(1, 10, 8);
      const perVent = Math.round(mix(4, 8, mood.energy));
      for (const origin of steamAt) for (let i = 0; i < perVent; i++) {
        const material = new THREE.MeshStandardMaterial({ color: '#c3ccd2', transparent: true, opacity: 0.3, depthWrite: false, roughness: 1 });
        const mesh = new THREE.Mesh(puffGeometry, material);
        s.root.add(mesh);
        puffs.push({ mesh, origin, phase: (i + random()) / perVent, sway: rnd(0, 6), material });
      }
    }
    const reach = mix(0.3, 0.55, mood.energy), speed = mix(0.12, 0.45, mood.energy);
    const drift = (time: number) => {
      for (const p of puffs) {
        const t = (time * speed + p.phase) % 1;
        p.mesh.position.set(p.origin[0] + Math.sin(p.sway + t * 4 + time * 0.6) * 0.05 * t + t * t * 0.08, p.origin[1] + t * reach, p.origin[2] + Math.cos(p.sway * 1.7 + t * 3) * 0.04 * t);
        p.mesh.scale.setScalar(0.022 + t * 0.07);
        p.material.opacity = 0.36 * Math.sin(Math.PI * Math.min(1, t * 1.15)) ** 0.7;
      }
    };
    drift(0);

    return s.finish({ update: (_dt, time) => drift(time) });
  },
});
