import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul } from '@conjure/kit';
import { paint } from './helpers';

const TAU = Math.PI * 2;
const PALETTE = {
  blush: ['#f3c6cc', '#fbeee6', '#e59aa8', '#f7dccf', '#d9788c'],
  white: ['#fbf9f2', '#f1efe2', '#e4ecd6', '#fffdf5', '#dfe8c8'],
  wild: ['#f1c232', '#d9548a', '#6f58c9', '#f08a3c', '#fbf9f2', '#4a90d9'],
  autumn: ['#b5492a', '#7c1f36', '#d98e32', '#e7c27a', '#5a2a3a'],
  tropical: ['#ff4f79', '#ff8a1f', '#ffd21f', '#d81e8a', '#19b5a5'],
  marigold: ['#f59a1b', '#f7c325', '#e9741a', '#fbd95a', '#f2f0e4'],
} as const;
type P3 = [number, number, number];

export default defineThing({
  questions: {
    form: choice('What is the arch made of?', {
      birch: 'Two rustic silver-birch poles and a crossbeam lashed together.',
      hoop: 'A single great ring of gold tube standing on its edge, a moon gate.',
      trellis: 'A white painted garden arch with a rounded top and lattice sides.',
      triangle: 'A bare timber A-frame, two long poles meeting at a point.',
      chuppah: 'A chuppah: four poles holding a square cloth canopy, the front corners tied back.',
      mandap: 'A mandap: four red and gold pillars under a peaked canopy, hung with strings of marigolds.',
    }),
    flowers: choice('What are the flowers like?', {
      blush: 'Blush and cream garden roses.',
      white: 'All white blooms and pale green foliage.',
      wild: 'A meadow mix: yellow, pink, violet, cornflower blue.',
      autumn: 'Rust, burgundy and ochre, with dried seed heads.',
      tropical: 'Hot pink, orange and yellow tropical brights.',
      marigold: 'Orange and gold marigolds.',
    }),
    arrangement: choice('How are the flowers arranged on it?', {
      full: 'Smothered end to end.',
      corner: 'One lavish spray swept up over a corner, the rest left bare.',
      crown: 'A band across the top only.',
      trailing: 'Along the top with long strands trailing down like wisteria.',
    }),
    state: choice('What state is it in?', {
      fresh: 'Fresh, full and ready for the ceremony.',
      dressing: 'Still being dressed: half done, a stepladder and buckets of stems beside it.',
      wilting: 'The next morning: blooms browning and drooping, petals dropped underneath.',
      dismantled: 'Half taken down, one garland lying on the grass and a ladder left against the job.',
    }),
    runner: choice('What leads up to it?', {
      petals: 'A scattered path of loose petals.',
      aisle: 'A white cloth aisle runner edged with petals.',
      rug: 'A patterned rug laid on the grass.',
      bare: 'Nothing but a few stray petals.',
    }),
    flank: choice('What stands at its feet?', {
      none: 'Nothing.',
      lanterns: 'Clusters of candle lanterns.',
      urns: 'Two urns of tall pampas grass.',
      churns: 'Milk churns stuffed with more flowers.',
    }),
    fabric: noul('Is sheer fabric swagged across it?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const colours = PALETTE[a.flowers];
    const wilt = a.state === 'wilting' ? 0.6 : a.state === 'dismantled' ? 0.3 : mood.wear * 0.2;
    const brown = new THREE.Color('#8a6a45');
    const pick = () => new THREE.Color(colours[Math.floor(random() * colours.length)]).lerp(brown, wilt * (0.5 + random() * 0.6));
    const green = () => new THREE.Color(['#5c8046', '#4a6e3c', '#7c9a58', '#3f5f38'][Math.floor(random() * 4)]).lerp(new THREE.Color('#8a7a45'), wilt * 0.8);

    // Instancing with per-item rotation, scale and colour.
    interface Item { p: P3; s: number | P3; c: THREE.Color; r?: P3 }
    const inst = (geometry: THREE.BufferGeometry, items: Item[], parent: THREE.Object3D = s.root, roughness = 0.75) => {
      if (!items.length) { geometry.dispose(); return null; }
      const mesh = new THREE.InstancedMesh(geometry, new THREE.MeshStandardMaterial({ color: '#ffffff', roughness }), items.length);
      const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
      items.forEach((it, k) => {
        if (it.r) q.setFromEuler(e.set(...it.r)); else q.identity();
        const sc = typeof it.s === 'number' ? [it.s, it.s, it.s] as P3 : it.s;
        m.compose(new THREE.Vector3(...it.p), q, new THREE.Vector3(...sc));
        mesh.setMatrixAt(k, m);
        mesh.setColorAt(k, it.c);
      });
      mesh.instanceMatrix.needsUpdate = true;
      mesh.instanceColor!.needsUpdate = true;
      mesh.castShadow = mesh.receiveShadow = true;
      parent.add(mesh);
      return mesh;
    };
    const bloomGeo = () => new THREE.IcosahedronGeometry(1, 1);
    const leafGeo = () => { const g = new THREE.SphereGeometry(1, 6, 4); g.scale(1, 0.18, 0.5); return g; };

    // Frame, and the line the flowers follow.
    let path: P3[] = [];
    let top = 2.3, frontZ = 0;
    const swayers: THREE.Group[] = [];
    if (a.form === 'birch') {
      const bark = paint(128, 256, (ctx, w, h) => {
        ctx.fillStyle = '#e2ddd0'; ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = '#2c2a27';
        for (let k = 0; k < 70; k++) ctx.fillRect(random() * w, random() * h, 8 + random() * 34, 2 + random() * 5);
      });
      bark.wrapS = bark.wrapT = THREE.RepeatWrapping;
      const birch = new THREE.MeshStandardMaterial({ map: bark, roughness: 0.8 });
      for (const x of [-1.05, 1.05]) {
        s.rod([x, 0, 0], [x * 0.98, 2.5, 0], 0.075, birch, 0.058);
        s.rod([x, 0.02, -0.45], [x, 0.9, 0], 0.045, birch);
        s.rod([x, 0.02, 0.45], [x, 0.9, 0], 0.045, birch);
        s.rod([x * 0.99, 1.75, 0], [x * 0.5, 2.3, 0], 0.03, birch);
        s.ring(0.06, 0.012, [x * 0.985, 2.3, 0], s.material('#b89a62')).rotation.x = Math.PI / 2;
      }
      s.rod([-1.4, 2.28, 0.03], [1.4, 2.33, 0.03], 0.065, birch, 0.052);
      path = [[-1.05, 0.25, 0], [-1.04, 2.3, 0], [1.04, 2.3, 0], [1.05, 0.25, 0]];
    } else if (a.form === 'hoop') {
      const gold = s.material('#c9a24c', { metalness: 0.85, roughness: 0.3 });
      s.mesh(new THREE.TorusGeometry(1.2, 0.04, 10, 96), gold, [0, 1.25, 0]);
      s.box([1.5, 0.04, 0.6], [0, 0.02, 0], gold);
      for (const x of [-0.5, 0.5]) s.rod([x, 0.04, 0], [x * 1.25, 0.26, 0], 0.02, gold);
      for (let k = 0; k <= 30; k++) { const ang = (205 - k * 230 / 30) * Math.PI / 180; path.push([Math.cos(ang) * 1.2, 1.25 + Math.sin(ang) * 1.2, 0]); }
      top = 2.45;
    } else if (a.form === 'trellis') {
      const paintWhite = s.material('#e3dfd0', { roughness: 0.6 });
      for (const z of [-0.28, 0.28]) {
        for (const x of [-1, 1]) s.rod([x, 0, z], [x, 1.5, z], 0.038, paintWhite);
        const hoop = s.mesh(new THREE.TorusGeometry(1, 0.038, 8, 48, Math.PI), paintWhite, [0, 1.5, z]);
        hoop.castShadow = true;
      }
      for (let k = 0; k < 7; k++) for (const x of [-1, 1]) s.rod([x, 0.2 + k * 0.21, -0.28], [x, 0.2 + k * 0.21, 0.28], 0.02, paintWhite);
      for (let k = 0; k < 5; k++) for (const x of [-1, 1]) {
        s.rod([x, 0.15 + k * 0.28, -0.28], [x, 0.43 + k * 0.28, 0.28], 0.014, paintWhite);
        s.rod([x, 0.43 + k * 0.28, -0.28], [x, 0.15 + k * 0.28, 0.28], 0.014, paintWhite);
      }
      for (let k = 1; k < 9; k++) { const ang = k / 9 * Math.PI; s.rod([Math.cos(ang), 1.5 + Math.sin(ang), -0.28], [Math.cos(ang), 1.5 + Math.sin(ang), 0.28], 0.02, paintWhite); }
      path.push([-1, 0.2, 0.28]);
      for (let k = 0; k <= 20; k++) { const ang = Math.PI - k / 20 * Math.PI; path.push([Math.cos(ang), 1.5 + Math.sin(ang), 0.28]); }
      path.push([1, 0.2, 0.28]);
      top = 2.5; frontZ = 0.28;
    } else if (a.form === 'triangle') {
      const timber = s.material('#a9794a', { roughness: 0.85 });
      s.rod([-1.3, 0, 0], [0.06, 2.85, 0], 0.045, timber);
      s.rod([1.3, 0, 0], [-0.06, 2.85, 0], 0.045, timber);
      s.rod([-1.45, 0.045, 0], [1.45, 0.045, 0], 0.045, timber);
      for (const x of [-1.3, 1.3]) s.rod([x, 0.04, -0.5], [x, 0.04, 0.5], 0.04, timber);
      path = [[-1.2, 0.25, 0], [0, 2.75, 0], [1.2, 0.25, 0]];
      top = 2.75;
    } else {
      const mandap = a.form === 'mandap';
      const X = 1.15, Z = 0.95, Hh = mandap ? 2.35 : 2.4;
      frontZ = Z; top = Hh;
      if (mandap) {
        const red = s.material('#b0202c', { roughness: 0.5 }), gold = s.material('#d4a63a', { metalness: 0.7, roughness: 0.35 });
        for (const x of [-X, X]) for (const z of [-Z, Z]) {
          s.box([0.26, 0.2, 0.26], [x, 0.1, z], gold);
          s.cylinder(0.075, 0.085, Hh - 0.2, [x, Hh / 2 + 0.1, z], red, 12);
          for (const yy of [0.55, 1.2, 1.85]) s.cylinder(0.092, 0.092, 0.06, [x, yy, z], gold, 12);
          s.box([0.24, 0.1, 0.24], [x, Hh + 0.02, z], gold);
        }
        for (const z of [-Z, Z]) s.box([X * 2 + 0.3, 0.09, 0.1], [0, Hh + 0.1, z], gold);
        for (const x of [-X, X]) s.box([0.1, 0.09, Z * 2 + 0.3], [x, Hh + 0.1, 0], gold);
        const roof = s.mesh(new THREE.ConeGeometry(1.95, 0.75, 4), red, [0, Hh + 0.52, 0]);
        roof.rotation.y = Math.PI / 4; roof.scale.z = 0.86;
        s.ball([0.1, 0.1, 0.1], [0, Hh + 0.93, 0], gold);
        s.cylinder(0.005, 0.03, 0.22, [0, Hh + 1.1, 0], gold, 8);
        // Scalloped gold valance.
        const scallops: Item[] = [];
        for (let k = 0; k < 13; k++) scallops.push({ p: [-X + k * X / 6, Hh + 0.04, Z + 0.06], s: [0.1, 0.1, 0.02], c: new THREE.Color('#e3b94a') });
        inst(new THREE.SphereGeometry(1, 10, 6), scallops, s.root, 0.4);
      } else {
        const wood = s.material('#d9c9a8', { roughness: 0.7 });
        for (const x of [-X, X]) for (const z of [-Z, Z]) { s.cylinder(0.035, 0.04, Hh, [x, Hh / 2, z], wood, 10); s.ball([0.05, 0.05, 0.05], [x, Hh + 0.03, z], wood, 10); }
        const cloth = paint(256, 256, (ctx, w, h) => {
          ctx.fillStyle = '#f7f4ea'; ctx.fillRect(0, 0, w, h);
          ctx.fillStyle = '#3d5fa8';
          for (const y of [14, 26, 34, h - 40, h - 32, h - 20]) ctx.fillRect(0, y, w, y % 4 === 2 ? 8 : 4);
        });
        const geo = new THREE.PlaneGeometry(X * 2 + 0.1, Z * 2 + 0.1, 14, 14);
        geo.rotateX(-Math.PI / 2);
        const pos = geo.attributes.position;
        for (let k = 0; k < pos.count; k++) { const u = pos.getX(k) / (X + 0.05), v = pos.getZ(k) / (Z + 0.05); pos.setY(k, -0.4 * (1 - u * u) * (1 - v * v) - 0.05 * (1 - Math.abs(u * v)) * (Math.abs(u) > 0.98 || Math.abs(v) > 0.98 ? 1 : 0)); }
        geo.computeVertexNormals();
        s.mesh(geo, new THREE.MeshStandardMaterial({ map: cloth, side: THREE.DoubleSide, roughness: 0.85 }), [0, Hh, 0]);
        const sheer = s.material('#fbf8f0', { side: THREE.DoubleSide, roughness: 0.9 });
        for (const x of [-X, X]) for (const z of [-Z, Z]) s.lathe([[0.13, 0], [0.1, 0.5], [0.045, 1.0], [0.1, 1.5], [0.17, 2.0], [0.04, 2.1]], sheer, [x * 0.985, Hh - 2.12, z * 0.985]);
      }
      path = [[-X, mandap ? 0.3 : 1.2, Z], [-X, Hh, Z], [X, Hh, Z], [X, mandap ? 0.3 : 1.2, Z]];
    }

    // Arc-length sampling of the flower line.
    const lengths = [0];
    for (let k = 1; k < path.length; k++) lengths.push(lengths[k - 1] + Math.hypot(path[k][0] - path[k - 1][0], path[k][1] - path[k - 1][1], path[k][2] - path[k - 1][2]));
    const total = lengths[lengths.length - 1];
    const along = (t: number): P3 => {
      const dist = t * total;
      let k = 1;
      while (k < path.length - 1 && lengths[k] < dist) k++;
      const f = (dist - lengths[k - 1]) / Math.max(lengths[k] - lengths[k - 1], 1e-6);
      return [mix(path[k - 1][0], path[k][0], f), mix(path[k - 1][1], path[k][1], f), mix(path[k - 1][2], path[k][2], f)];
    };
    const flip = random() < 0.5;
    const cover = (t0: number) => {
      const t = flip ? 1 - t0 : t0;
      let c = 1;
      if (a.arrangement === 'corner') c = Math.max(Math.exp(-(((t - 0.33) / 0.2) ** 2)), 0.75 * Math.exp(-(((t - 0.95) / 0.07) ** 2)));
      if (a.arrangement === 'crown' || a.arrangement === 'trailing') c = Math.exp(-(((t - 0.5) / 0.22) ** 4));
      if (a.state === 'dressing' && t > 0.5) c *= 0.04;
      if (a.state === 'dismantled' && t < 0.52) c *= 0.03;
      return c;
    };

    const blooms: Item[] = [], leaves: Item[] = [], fallen: Item[] = [];
    const want = Math.round(mix(380, 760, mood.density) * total / 6.5);
    for (let k = 0; k < want; k++) {
      const t = random(), c = cover(t);
      if (random() > c) continue;
      const [x, y, z] = along(t);
      const spread = 0.06 + 0.15 * c * random();
      const dir = new THREE.Vector3(random() - 0.5, random() - 0.5, (random() - 0.35)).normalize().multiplyScalar(spread);
      const droop = wilt * random() * 0.22;
      const big = random() < 0.2;
      blooms.push({ p: [x + dir.x, Math.max(0.05, y + dir.y - droop), z + dir.z], s: (big ? 0.085 + random() * 0.035 : 0.04 + random() * 0.035) * (1 - wilt * 0.25), c: pick(), r: [random() * 3, random() * 3, 0] });
      if (random() < 0.8) leaves.push({ p: [x + dir.x * 1.5 + (random() - 0.5) * 0.1, y + dir.y * 1.5 - droop * 1.4 + (random() - 0.5) * 0.1, z + dir.z * 1.2], s: 0.1 + random() * 0.09, c: green(), r: [random() * TAU, random() * TAU, random() * TAU] });
      if (wilt > 0.25 && random() < wilt * 0.7) fallen.push({ p: [x + (random() - 0.5) * 0.9, 0.006, z + (random() - 0.3) * 0.9], s: [0.03, 0.006, 0.022], c: pick(), r: [0, random() * TAU, 0] });
    }
    inst(bloomGeo(), blooms);
    inst(leafGeo(), leaves);

    // Trailing strands (and the mandap's marigold strings) hang from the top and sway.
    const strand = (x: number, z: number, len: number, marigold: boolean) => {
      const g = new THREE.Group();
      const topAt = a.form === 'hoop' ? 1.25 + Math.sqrt(1.44 - x * x) : a.form === 'trellis' ? 1.5 + Math.sqrt(1 - x * x) : a.form === 'triangle' ? 2.75 - Math.abs(x) * 2.08 : top;
      g.position.set(x, topAt - 0.03, z);
      const items: Item[] = [];
      for (let yy = 0.05; yy < len; yy += marigold ? 0.062 : 0.07) {
        const c = marigold ? new THREE.Color(['#f59a1b', '#f7c325', '#e9741a'][Math.floor(random() * 3)]).lerp(brown, wilt * 0.6) : random() < 0.3 ? green() : pick();
        items.push({ p: [(random() - 0.5) * 0.03, -yy, (random() - 0.5) * 0.03], s: marigold ? 0.034 : 0.03 + random() * 0.025 * (1 - yy / len), c });
      }
      inst(bloomGeo(), items, g);
      s.root.add(g);
      swayers.push(g);
    };
    const leftOnly = a.state === 'dressing', rightOnly = a.state === 'dismantled';
    const keep = (x: number) => !((leftOnly && (flip ? x < 0 : x > 0)) || (rightOnly && (flip ? x > 0 : x < 0)));
    if (a.form === 'mandap') {
      for (let k = 0; k <= 12; k++) { const x = -1.05 + k * 0.175; if (keep(x)) strand(x, frontZ + 0.06, 0.45 + Math.abs(Math.cos(k * Math.PI / 6)) * 0.55 + random() * 0.1, true); }
      for (const x of [-1.2, 1.2]) for (let k = 0; k < 7; k++) if (keep(x)) strand(x, -0.75 + k * 0.25, 0.5 + random() * 0.4, true);
    }
    if (a.arrangement === 'trailing') {
      const span = a.form === 'triangle' ? 0.5 : 0.85;
      const count = 6 + Math.round(mood.density * 6);
      for (let k = 0; k < count; k++) { const x = (random() * 2 - 1) * span; if (keep(x)) strand(x, frontZ + (random() - 0.5) * 0.1, 0.5 + random() * 1.0, false); }
    }

    // Swagged fabric.
    if (a.fabric && a.form !== 'mandap') {
      const sheer = new THREE.MeshStandardMaterial({ color: '#fbf6ec', side: THREE.DoubleSide, roughness: 0.9, transparent: true, opacity: 0.86 });
      const ribbon = (pts: P3[], width: number) => {
        const curve = new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(...p)));
        const n = 40, verts: number[] = [], index: number[] = [];
        for (let k = 0; k <= n; k++) {
          const p = curve.getPoint(k / n), w = width * (0.55 + 0.45 * Math.abs(Math.sin(k / n * Math.PI * 3)));
          verts.push(p.x, p.y + w / 2, p.z - 0.05, p.x, p.y - w / 2, p.z + 0.07);
          if (k < n) index.push(k * 2, k * 2 + 1, k * 2 + 2, k * 2 + 1, k * 2 + 3, k * 2 + 2);
        }
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
        geo.setIndex(index);
        geo.computeVertexNormals();
        s.mesh(geo, sheer);
      };
      const [lx, , lz] = along(0.02), [rx] = along(0.98), [, my] = along(0.5);
      const zz = lz + 0.09, sag = a.form === 'triangle' ? 1.2 : 0.45;
      const yl = along(0.3)[1], yr = along(0.7)[1];
      ribbon([[along(0.3)[0], yl, zz], [along(0.3)[0] * 0.5, Math.min(yl, my) - sag * 0.6, zz + 0.05], [0, Math.min(my - sag, yl - 0.1), zz + 0.08], [along(0.7)[0] * 0.5, Math.min(yr, my) - sag * 0.6, zz + 0.05], [along(0.7)[0], yr, zz]], 0.3);
      ribbon([[along(0.3)[0], yl, zz], [lx - 0.12, yl * 0.6, zz], [lx - 0.02, 0.5, zz], [lx - 0.2, 0.03, zz + 0.2]], 0.26);
      ribbon([[along(0.7)[0], yr, zz], [rx + 0.12, yr * 0.6, zz], [rx + 0.02, 0.5, zz], [rx + 0.2, 0.03, zz + 0.2]], 0.26);
    }

    // The approach.
    const z0 = frontZ + 0.5, z1 = frontZ + 2.2;
    if (a.runner === 'aisle') s.box([1.0, 0.012, z1 - z0 + 0.3], [0, 0.006, (z0 + z1) / 2 - 0.15], s.material('#f6f3ea', { roughness: 0.9 }));
    if (a.runner === 'rug') {
      const base = ['#8e2f2b', '#27506b', '#7a5a2a'][Math.floor(random() * 3)];
      const rug = paint(128, 320, (ctx, w, h) => {
        ctx.fillStyle = base; ctx.fillRect(0, 0, w, h);
        ctx.strokeStyle = '#e8d9b0'; ctx.lineWidth = 5; ctx.strokeRect(9, 9, w - 18, h - 18);
        ctx.strokeStyle = '#1f2533'; ctx.lineWidth = 3; ctx.strokeRect(18, 18, w - 36, h - 36);
        for (let k = 0; k < 3; k++) {
          const cy = h * (0.25 + k * 0.25);
          ctx.fillStyle = '#e8d9b0'; ctx.beginPath(); ctx.moveTo(w / 2, cy - 30); ctx.lineTo(w / 2 + 26, cy); ctx.lineTo(w / 2, cy + 30); ctx.lineTo(w / 2 - 26, cy); ctx.fill();
          ctx.fillStyle = '#1f2533'; ctx.beginPath(); ctx.arc(w / 2, cy, 9, 0, TAU); ctx.fill();
        }
      });
      const mesh = s.box([1.15, 0.016, z1 - z0 + 0.2], [0, 0.008, (z0 + z1) / 2 - 0.1], s.material(base));
      const plain = mesh.material;
      (mesh as THREE.Mesh).material = [plain, plain, new THREE.MeshStandardMaterial({ map: rug, roughness: 0.95 }), plain, plain, plain];
      mesh.rotation.y = (random() - 0.5) * 0.08;
    }
    const strewn = a.runner === 'bare' ? 16 : a.runner === 'petals' ? Math.round(mix(260, 520, mood.density)) : Math.round(mix(110, 220, mood.density));
    for (let k = 0; k < strewn; k++) {
      const z = mix(z0 - 0.4, z1, random());
      let x = (random() + random() - 1) * 0.5;
      if (a.runner === 'aisle' || a.runner === 'rug') x = (random() < 0.5 ? -1 : 1) * (0.5 + random() * 0.22);
      if (a.runner === 'bare') x *= 3;
      fallen.push({ p: [x, a.runner === 'petals' || a.runner === 'bare' ? 0.006 : 0.008, z], s: [0.034, 0.006, 0.024], c: pick(), r: [0, random() * TAU, 0] });
    }
    inst(new THREE.SphereGeometry(1, 6, 4), fallen);

    // What stands at its feet.
    const feet = [along(0.0), along(1.0)].map(([x, , z]) => [x + Math.sign(x) * 0.45, z + 0.35] as const);
    const flames: THREE.MeshStandardMaterial[] = [];
    if (a.flank === 'lanterns') {
      const iron = s.material('#2a2a2c', { metalness: 0.5, roughness: 0.5 });
      const glass = new THREE.MeshStandardMaterial({ color: '#fff3d6', transparent: true, opacity: 0.25, depthWrite: false });
      for (const [fx, fz] of feet) for (let k = 0; k < 2 + Math.round(mood.density * 2); k++) {
        const h = 0.28 + random() * 0.3, w = 0.16 + random() * 0.05, x = fx + (random() - 0.5) * 0.7, z = fz + (random() - 0.3) * 0.6;
        s.box([w, 0.03, w], [x, 0.015, z], iron);
        s.box([w, 0.03, w], [x, h, z], iron);
        for (const ex of [-1, 1]) for (const ez of [-1, 1]) s.box([0.014, h, 0.014], [x + ex * (w / 2 - 0.007), h / 2, z + ez * (w / 2 - 0.007)], iron);
        s.box([w - 0.02, h - 0.03, w - 0.02], [x, h / 2, z], glass);
        s.cylinder(0.035, 0.035, h * 0.4, [x, h * 0.2 + 0.03, z], s.material('#f7f0df'), 10);
        const fl = s.material('#ffd98a', { emissive: new THREE.Color().setHSL(mix(0.13, 0.07, mood.warmth), 1, 0.55), emissiveIntensity: mix(1, 2.4, mood.cheer) });
        s.ball([0.016, 0.034, 0.016], [x, h * 0.4 + 0.06, z], fl, 8).castShadow = false;
        s.ring(0.05, 0.006, [x, h + 0.05, z], iron);
        flames.push(fl);
      }
    }
    if (a.flank === 'urns') {
      const stone = s.material('#cfc8b8', { roughness: 0.9 });
      const plumes: Item[] = [];
      for (const [fx, fz] of feet) {
        s.lathe([[0, 0], [0.14, 0], [0.15, 0.04], [0.07, 0.1], [0.09, 0.2], [0.2, 0.42], [0.19, 0.55], [0.14, 0.6], [0.16, 0.64], [0, 0.6]], stone, [fx, 0, fz]);
        for (let k = 0; k < 9; k++) {
          const lean = new THREE.Vector3((random() - 0.5) * 0.7, 1, (random() - 0.5) * 0.7).normalize(), len = 0.7 + random() * 0.6;
          s.rod([fx, 0.6, fz], [fx + lean.x * len, 0.6 + lean.y * len, fz + lean.z * len], 0.006, s.material('#b8a878'));
          plumes.push({ p: [fx + lean.x * (len + 0.14), 0.6 + lean.y * (len + 0.14), fz + lean.z * (len + 0.14)], s: [0.05, 0.2, 0.05], c: new THREE.Color(['#e9dcc0', '#d9c8a4', '#f2e9d6'][k % 3]), r: [lean.z * 0.9, 0, -lean.x * 0.9] });
        }
      }
      inst(new THREE.SphereGeometry(1, 8, 6), plumes, s.root, 1);
    }
    const bucket = (x: number, z: number, churn: boolean) => {
      const zinc = s.material(churn ? '#aab0ae' : '#8f9794', { metalness: 0.6, roughness: 0.45 });
      const h = churn ? 0.55 : 0.3;
      if (churn) s.lathe([[0, 0], [0.16, 0], [0.17, 0.02], [0.17, 0.36], [0.1, 0.48], [0.1, 0.53], [0.125, 0.55], [0, 0.5]], zinc, [x, 0, z]);
      else s.lathe([[0, 0], [0.11, 0], [0.14, 0.3], [0.15, 0.3], [0, 0.26]], zinc, [x, 0, z]);
      const stems: Item[] = [], heads: Item[] = [];
      for (let k = 0; k < 12; k++) {
        const th = random() * TAU, rr = random() * 0.16, hh = h + 0.12 + random() * 0.3;
        heads.push({ p: [x + Math.sin(th) * rr, hh, z + Math.cos(th) * rr], s: 0.045 + random() * 0.04, c: pick() });
        stems.push({ p: [x + Math.sin(th) * rr * 0.9, hh - 0.09, z + Math.cos(th) * rr * 0.9], s: 0.09 + random() * 0.05, c: green(), r: [random() * TAU, random() * TAU, 0] });
      }
      inst(bloomGeo(), heads);
      inst(leafGeo(), stems);
    };
    if (a.flank === 'churns') for (const [fx, fz] of feet) bucket(fx, fz, true);

    // Work in progress, before or after.
    const side = (flip ? leftOnly : !leftOnly) ? 1 : -1;
    if (a.state === 'dressing' || a.state === 'dismantled') {
      const lad = new THREE.Group();
      const alu = s.material(random() < 0.5 ? '#b9bfc2' : '#c08a4a', { metalness: 0.4, roughness: 0.5 });
      const part = (from: P3, to: P3, r: number) => lad.add(s.rod(from, to, r, alu));
      for (const x of [-1, 1]) { part([x * 0.27, 0, 0.42], [x * 0.2, 1.75, 0], 0.02); part([x * 0.27, 0, -0.42], [x * 0.2, 1.75, 0], 0.02); }
      for (let k = 1; k < 7; k++) { const f = k / 7; lad.add(s.box([0.54 - f * 0.14, 0.022, 0.09], [0, f * 1.75, 0.42 * (1 - f)], alu)); }
      lad.add(s.box([0.46, 0.03, 0.2], [0, 1.76, 0], alu));
      lad.position.set(side * (Math.abs(along(0)[0]) + 0.75), 0, frontZ + 0.45);
      lad.rotation.y = side * -0.5 + (random() - 0.5) * 0.3;
      s.root.add(lad);
    }
    if (a.state === 'dressing') { bucket(side * 0.5, frontZ + 0.8, false); bucket(side * 0.95 + 0.1, frontZ + 1.15, false); }
    if (a.state === 'dismantled') {
      const lying: Item[] = [], lyingLeaves: Item[] = [];
      const gx = -side * 0.4, len = 2.2;
      for (let k = 0; k < 150; k++) {
        const t = random(), x = gx - side * t * len * 0.75, z = frontZ + 0.7 + Math.sin(t * 5) * 0.28 + t * 0.6;
        lying.push({ p: [x + (random() - 0.5) * 0.16, 0.04 + random() * 0.08, z + (random() - 0.5) * 0.16], s: 0.04 + random() * 0.05, c: pick() });
        if (k % 2) lyingLeaves.push({ p: [x + (random() - 0.5) * 0.3, 0.03, z + (random() - 0.5) * 0.3], s: 0.12, c: green(), r: [0, random() * TAU, 0] });
      }
      inst(bloomGeo(), lying);
      inst(leafGeo(), lyingLeaves);
      s.box([0.6, 0.32, 0.42], [side * 1.0, 0.16, frontZ + 1.4], s.material('#b08a5a', { roughness: 0.9 })).rotation.y = 0.3;
    }

    const phase = swayers.map(() => random() * TAU);
    return s.finish({
      footprint: 1.7,
      update: (_dt, time) => {
        swayers.forEach((g, k) => { g.rotation.x = Math.sin(time * 1.3 + phase[k]) * 0.07 * mood.energy; g.rotation.z = Math.cos(time * 0.9 + phase[k]) * 0.05 * mood.energy; });
        flames.forEach((fl, k) => { fl.emissiveIntensity = mix(1, 2.4, mood.cheer) * (1 + Math.sin(time * (7 + k)) * 0.3 * mood.energy); });
      },
    });
  },
});
