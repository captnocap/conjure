import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul, score } from '@conjure/kit';

type V3 = [number, number, number];
interface Bit { p: V3; r?: V3; s?: V3 | number; c?: THREE.ColorRepresentation }

function strew(parent: THREE.Object3D, geometry: THREE.BufferGeometry, material: THREE.Material, bits: readonly Bit[]) {
  if (!bits.length) return null;
  const mesh = new THREE.InstancedMesh(geometry, material, bits.length);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), sc = new THREE.Vector3(), po = new THREE.Vector3();
  bits.forEach((bit, i) => {
    e.set(...(bit.r ?? [0, 0, 0]));
    q.setFromEuler(e);
    if (typeof bit.s === 'number') sc.setScalar(bit.s); else sc.set(...(bit.s ?? [1, 1, 1]));
    m.compose(po.set(...bit.p), q, sc);
    mesh.setMatrixAt(i, m);
    mesh.setColorAt(i, new THREE.Color(bit.c ?? '#ffffff'));
  });
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  mesh.castShadow = mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

export default defineThing({
  questions: {
    load: choice('What is on the pans?', {
      dough: 'Rows of pale dough balls proving, swelling under the cover.',
      croissants: 'Golden croissants and pastries, baked and cooling.',
      loaves: 'Dark crusty loaves just out of the oven.',
      vegetables: 'Prepped vegetables in bright heaps: diced carrot, greens, red peppers, onions.',
      cookies: 'Flat brown cookies in tidy grids.',
      desserts: 'Rows of small plated desserts for a banquet, identical, counted.',
      dirty: 'Burnt-on, greasy dirty pans shoved in crooked, waiting for the dish pit.',
      bare: 'Clean empty pans, nothing on them.',
    }),
    fill: score('How many of the runners hold a pan?', ['Just one or two', 'A third', 'Most of them', 'Every single slot']),
    frame: choice('What kind of rack is it?', {
      tall: 'A full-height aluminium rack, taller than the cooks.',
      half: 'A half-height rack that rolls under a counter.',
      double: 'A wide double rack, two columns of pans side by side.',
    }),
    cover: choice('Is it covered?', {
      none: 'No cover, open to the kitchen air.',
      half: 'A clear plastic cover pulled halfway down, the rest bunched up.',
      full: 'Zipped fully into a clear plastic cover, fogged inside.',
      wrapped: 'Wound round and round with bands of cling film.',
    }),
    pulled: noul('Is one pan pulled halfway out, as if someone is mid-task?'),
    tag: choice('What label is taped to the frame?', {
      none: 'No label.',
      day: 'A day-dot tape strip with the weekday.',
      pastry: 'PASTRY - DO NOT TOUCH.',
      banquet: 'A banquet count: PARTY OF 200.',
      dish: 'DIRTY - TO DISH.',
    }),
    top: choice('What has been left on top of the rack?', {
      nothing: 'Nothing.',
      spare: 'A leaning stack of spare pans.',
      film: 'A roll of cling film and a box of gloves.',
      mitts: 'A pair of oven mitts and a kitchen timer.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const alu = s.material('#cfd3d3', { metalness: 0.75, roughness: 0.35 });
    const aluDull = s.material('#aeb3b3', { metalness: 0.65, roughness: 0.5 });
    const dark = s.material('#232527', { roughness: 0.7 });
    const paper = s.material('#efe7d2', { roughness: 0.95 });
    const HX = 0.27, HZ = 0.33, BASE = 0.13;
    const levels = a.frame === 'half' ? 6 : 12;
    const pitch = a.frame === 'half' ? 0.125 : 0.132;
    const TOP = BASE + 0.1 + levels * pitch + 0.04;
    const columns = a.frame === 'double' ? [-0.29, 0.29] : [0];
    const tube = 0.028;

    // Frame.
    const slides: Bit[] = [];
    for (const cx of columns) {
      for (const x of [-1, 1]) for (const z of [-1, 1]) s.box([tube, TOP - BASE, tube], [cx + x * HX, (TOP + BASE) / 2, z * HZ], alu);
      for (const y of [BASE + tube / 2, TOP - tube / 2]) {
        for (const x of [-1, 1]) s.box([tube, tube, HZ * 2], [cx + x * HX, y, 0], alu);
        s.box([HX * 2, tube, tube], [cx, y, -HZ], alu);
      }
      s.box([HX * 2, tube, tube], [cx, TOP - tube / 2, HZ], alu);
      for (let i = 0; i < levels; i++) for (const x of [-1, 1]) slides.push({ p: [cx + x * (HX - 0.028), BASE + 0.1 + i * pitch, 0], s: [0.03, 0.004, HZ * 2 - 0.02] });
    }
    strew(s.root, new THREE.BoxGeometry(1, 1, 1), alu, slides);
    const wheelX = a.frame === 'double' ? [-0.29 - HX, 0.29 + HX] : [-HX, HX];
    const casters: THREE.Mesh[] = [];
    for (const x of wheelX) for (const z of [-1, 1]) {
      const swivel = random() * 3;
      s.cylinder(0.022, 0.022, 0.04, [x, BASE - 0.02, z * HZ], aluDull, 10);
      s.box([0.045, 0.05, 0.02], [x, BASE - 0.06, z * HZ], aluDull).rotation.y = swivel;
      const wheel = s.cylinder(0.05, 0.05, 0.03, [x + Math.cos(swivel) * 0.02, 0.05, z * HZ - Math.sin(swivel) * 0.02], dark, 16);
      wheel.rotation.set(0, swivel, Math.PI / 2);
      casters.push(wheel);
    }

    // Pans and what is on them.
    const dirty = a.load === 'dirty';
    const panMat = dirty ? s.material('#8d8a80', { metalness: 0.5, roughness: 0.7 }) : aluDull;
    const burnt = s.material('#2b1d12', { roughness: 0.95 });
    const round = new THREE.SphereGeometry(1, 12, 8), cube = new THREE.BoxGeometry(1, 1, 1), disc = new THREE.CylinderGeometry(1, 1, 1, 14), crescent = new THREE.TorusGeometry(0.034, 0.017, 6, 10, Math.PI), lump = new THREE.IcosahedronGeometry(1, 1);
    const balls: Bit[] = [], cubes: Bit[] = [], discs: Bit[] = [], crescents: Bit[] = [], lumps: Bit[] = [];
    const panW = 0.46, panD = 0.64;
    const vegPalette: [string, string][] = [['#e8872b', '#f0a04a'], ['#4f9a3a', '#7ab648'], ['#c93a2c', '#e0553a'], ['#efe6cf', '#d9c9ec'], ['#7a3f8a', '#9a5aa8'], ['#e8c531', '#f2dc6a']];
    const fillChance = Math.min(1, mix(0.22, 1, Math.sqrt(a.fill)) + (mood.density - 0.5) * 0.15);
    let pullable: { g: THREE.Group }[] = [];
    let any = false;
    for (const cx of columns) for (let i = 0; i < levels; i++) {
      const forced = !any && i === levels - 2 && cx === columns[0];
      if (!forced && random() > fillChance) continue;
      any = true;
      const g = new THREE.Group();
      g.position.set(cx, BASE + 0.1 + i * pitch + 0.004, 0);
      if (dirty) { g.rotation.y = (random() - 0.5) * 0.12; g.position.z = (random() - 0.3) * 0.12; }
      const pan = new THREE.Mesh(new THREE.BoxGeometry(panW, 0.012, panD), panMat);
      pan.position.y = 0.006;
      const lip = new THREE.Mesh(new THREE.BoxGeometry(panW, 0.022, 0.012), panMat);
      lip.position.set(0, 0.011, panD / 2);
      pan.castShadow = pan.receiveShadow = lip.castShadow = true;
      g.add(pan, lip);
      const local: { list: Bit[]; bit: Bit }[] = [];
      const put = (list: Bit[], bit: Bit) => local.push({ list, bit });
      const grid = (nx: number, nz: number, fn: (x: number, z: number) => void) => {
        for (let ix = 0; ix < nx; ix++) for (let iz = 0; iz < nz; iz++) fn((ix + 0.5) / nx * (panW - 0.06) - (panW - 0.06) / 2 + (random() - 0.5) * 0.012, (iz + 0.5) / nz * (panD - 0.06) - (panD - 0.06) / 2 + (random() - 0.5) * 0.012);
      };
      if (a.load !== 'dirty' && a.load !== 'bare' && a.load !== 'vegetables') {
        const sheet = new THREE.Mesh(new THREE.BoxGeometry(panW - 0.02, 0.003, panD - 0.02), paper);
        sheet.position.y = 0.0135;
        sheet.receiveShadow = true;
        g.add(sheet);
      }
      const y0 = 0.015;
      if (a.load === 'dough') grid(3, 4, (x, z) => { const k = mix(0.045, 0.06, random()); put(balls, { p: [x, y0 + k * 0.45, z], s: [k, k * 0.62, k], c: '#f1e3c2' }); });
      else if (a.load === 'croissants') grid(3, 4, (x, z) => put(crescents, { p: [x, y0 + 0.016, z], r: [Math.PI / 2, 0, random() * 0.6 - 0.3], s: [1.15, 1.15, 1.3], c: new THREE.Color('#d08c34').offsetHSL(0, 0, (random() - 0.5) * 0.1) }));
      else if (a.load === 'loaves') grid(2, 3, (x, z) => put(balls, { p: [x, y0 + 0.035, z], r: [0, (random() - 0.5) * 0.3, 0], s: [0.085, 0.045, 0.06], c: new THREE.Color('#9a5a26').offsetHSL(0, 0, (random() - 0.5) * 0.08) }));
      else if (a.load === 'cookies') grid(3, 5, (x, z) => put(discs, { p: [x, y0 + 0.006, z], s: [0.045, 0.012, 0.045], c: random() < 0.5 ? '#a96b34' : '#8c5328' }));
      else if (a.load === 'desserts') grid(3, 4, (x, z) => {
        put(discs, { p: [x, y0 + 0.004, z], s: [0.055, 0.006, 0.055], c: '#f6f4ee' });
        put(discs, { p: [x, y0 + 0.028, z], s: [0.03, 0.04, 0.03], c: mood.cheer > 0.5 ? '#f0c8d0' : '#4f2d1d' });
        put(balls, { p: [x, y0 + 0.055, z], s: 0.011, c: '#c4233a' });
      });
      else if (a.load === 'vegetables') {
        const [c1, c2] = vegPalette[Math.floor(random() * vegPalette.length)];
        const n = 60;
        for (let k = 0; k < n; k++) {
          const px = (random() - 0.5) * (panW - 0.07), pz = (random() - 0.5) * (panD - 0.07);
          const heap = Math.max(0, 1 - Math.hypot(px / 0.2, pz / 0.3));
          put(cubes, { p: [px, y0 + 0.01 + random() * 0.05 * heap, pz], r: [random() * 3, random() * 3, random() * 3], s: [0.022, 0.016, 0.03], c: random() < 0.5 ? c1 : c2 });
        }
      } else if (a.load === 'dirty') {
        for (let k = 0; k < 6; k++) put(discs, { p: [(random() - 0.5) * 0.36, y0, (random() - 0.5) * 0.52], s: [mix(0.03, 0.09, random()), 0.004, mix(0.03, 0.09, random())], c: ['#2b1d12', '#5a3a1a', '#7a5a2a'][k % 3] });
        if (random() < 0.5) put(lumps, { p: [(random() - 0.5) * 0.3, y0 + 0.012, (random() - 0.5) * 0.4], s: [0.03, 0.012, 0.025], c: '#1c1410' });
      }
      const lists = new Map<Bit[], Bit[]>();
      for (const { list, bit } of local) { if (!lists.has(list)) lists.set(list, []); lists.get(list)!.push(bit); }
      const geo = new Map<Bit[], THREE.BufferGeometry>([[balls, round], [cubes, cube], [discs, disc], [crescents, crescent], [lumps, lump]]);
      for (const [list, bits] of lists) strew(g, geo.get(list)!, new THREE.MeshStandardMaterial({ roughness: 0.8 }), bits);
      s.root.add(g);
      if (i > 1 && i < levels - 1) pullable.push({ g });
    }
    void burnt;
    if (a.pulled && pullable.length) {
      const pick = pullable[Math.floor(random() * pullable.length)];
      pick.g.position.z = mix(0.26, 0.36, random());
      pick.g.rotation.y = (random() - 0.5) * 0.06;
    }

    // Top of the rack.
    const topX = columns[0];
    if (a.top === 'spare') {
      const n = 3 + Math.floor(random() * 5);
      for (let i = 0; i < n; i++) { const p = s.box([panW, 0.014, panD], [topX + (random() - 0.5) * 0.03, TOP + 0.008 + i * 0.016, (random() - 0.5) * 0.04], panMat); p.rotation.y = (random() - 0.5) * 0.12; }
    } else if (a.top === 'film') {
      s.box([panW, 0.012, panD], [topX, TOP + 0.006, 0], aluDull);
      s.box([0.34, 0.07, 0.08], [topX, TOP + 0.047, 0.1], s.material('#2f62b0'));
      const roll = s.cylinder(0.03, 0.03, 0.3, [topX + 0.02, TOP + 0.09, 0.1], s.material('#eaf2f4', { roughness: 0.2 }), 14);
      roll.rotation.z = Math.PI / 2;
      s.box([0.22, 0.07, 0.12], [topX - 0.05, TOP + 0.047, -0.14], s.material('#7fb8d9')).rotation.y = 0.3;
    } else if (a.top === 'mitts') {
      s.box([panW, 0.012, panD], [topX, TOP + 0.006, 0], aluDull);
      const mitt = s.material(mood.cheer > 0.5 ? '#c8452f' : '#56606a', { roughness: 0.95 });
      s.ball([0.07, 0.025, 0.13], [topX - 0.08, TOP + 0.035, 0.05], mitt, 12).rotation.y = 0.4;
      s.ball([0.07, 0.025, 0.13], [topX + 0.07, TOP + 0.04, 0.0], mitt, 12).rotation.y = -0.7;
      s.cylinder(0.04, 0.045, 0.04, [topX + 0.05, TOP + 0.032, -0.2], s.material('#f1efe8'), 16);
      s.cylinder(0.03, 0.03, 0.012, [topX + 0.05, TOP + 0.058, -0.2], s.material('#c93a2c'), 16);
    }

    // Tape label on the front upright.
    if (a.tag !== 'none') {
      const days = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
      const dayTint = ['#3c6fb0', '#e8c531', '#c93a2c', '#7a4a2a', '#4f9a3a', '#e8872b', '#22272b'];
      const d = Math.floor(random() * 7);
      const text = { day: days[d], pastry: 'PASTRY - DO NOT TOUCH', banquet: 'PARTY OF 200', dish: 'DIRTY - TO DISH' }[a.tag];
      const wide = a.tag === 'day' ? 0.14 : 0.42;
      const edge = columns[columns.length - 1] + HX;
      const tag = s.label(text, wide, a.tag === 'day' ? 0.07 : 0.075, [edge - wide / 2 + 0.03, TOP - 0.12 - random() * 0.1, HZ + tube / 2 + 0.004], a.tag === 'day' ? '#ffffff' : '#22272b', a.tag === 'day' ? dayTint[d] : '#f1e9b8');
      tag.rotation.z = (random() - 0.5) * 0.12;
    }

    // Plastic cover: see-through, so it is not measured as solid.
    const sheets: THREE.Mesh[] = [];
    if (a.cover !== 'none') {
      const film = new THREE.MeshStandardMaterial({ color: '#dcecf2', transparent: true, opacity: a.cover === 'full' ? 0.34 : 0.26, roughness: 0.15, depthWrite: false, side: THREE.DoubleSide });
      const crease = new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.5, depthWrite: false });
      const fullW = (columns.length > 1 ? 0.58 : 0) + HX * 2 + 0.07, fullD = HZ * 2 + 0.07;
      const drape = (yLow: number, yHigh: number) => {
        const m = s.box([fullW, yHigh - yLow, fullD], [0, (yLow + yHigh) / 2, 0], film);
        m.castShadow = false;
        sheets.push(m);
        for (let i = 0; i < 9; i++) {
          const len = (yHigh - yLow) * mix(0.3, 0.9, random());
          const c = s.box([0.006, len, 0.002], [(random() - 0.5) * fullW * 0.9, yHigh - len / 2 - random() * (yHigh - yLow - len), fullD / 2 + 0.002], crease);
          c.rotation.z = (random() - 0.5) * 0.15;
          c.castShadow = false;
        }
      };
      if (a.cover === 'full') {
        drape(BASE - 0.02, TOP + 0.03);
        s.box([0.012, TOP - BASE, 0.004], [fullW * 0.2, (TOP + BASE) / 2, fullD / 2 + 0.004], dark).castShadow = false;
      } else if (a.cover === 'half') {
        const cut = mix(BASE + 0.25, TOP - 0.4, random());
        drape(cut, TOP + 0.03);
        const bunch = new THREE.MeshStandardMaterial({ color: '#e9f3f6', transparent: true, opacity: 0.6, roughness: 0.3, depthWrite: false });
        const roll = s.cylinder(0.045, 0.05, fullW, [0, cut, fullD / 2 + 0.02], bunch, 10);
        roll.rotation.z = Math.PI / 2;
        roll.castShadow = false;
      } else {
        const bands = 4 + Math.floor(random() * 4);
        for (let i = 0; i < bands; i++) { const y = mix(BASE + 0.15, TOP - 0.15, (i + random() * 0.6) / bands); drape(y - 0.08, y + 0.1); }
      }
    }

    // Wear: flour or grime at the feet.
    const dustTint = dirty ? '#5a4a3a' : '#efe8d8';
    for (let i = 0; i < Math.round(mood.wear * 9); i++) {
      const d = s.cylinder(0.03 + random() * 0.05, 0.03 + random() * 0.05, 0.003, [(random() - 0.5) * 0.8, 0.0015, (random() - 0.5) * 0.8], s.material(dustTint, { roughness: 1 }), 9);
      d.castShadow = false;
    }

    const flutter = mix(0, 0.012, mood.energy);
    return s.finish({
      update: (_dt, time) => {
        sheets.forEach((m, i) => { m.scale.x = 1 + Math.sin(time * 1.7 + i) * flutter; m.scale.z = 1 + Math.cos(time * 1.3 + i * 2) * flutter; });
      },
    });
  },
});
