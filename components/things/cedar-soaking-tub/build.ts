import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul } from '@conjure/kit';

type P3 = [number, number, number];

/** Staves or planks painted side by side, each a slightly different board. */
function boards(random: () => number, base: string, count: number, horizontal: boolean) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 512;
  const ctx = canvas.getContext('2d')!;
  const tone = new THREE.Color(base);
  const step = 512 / count;
  for (let i = 0; i < count; i++) {
    const a = i * step;
    ctx.fillStyle = '#' + tone.clone().offsetHSL((random() - 0.5) * 0.02, 0, (random() - 0.5) * 0.1).getHexString();
    if (horizontal) ctx.fillRect(0, a, 512, step + 1); else ctx.fillRect(a, 0, step + 1, 512);
    ctx.strokeStyle = 'rgba(70,40,12,0.16)';
    ctx.lineWidth = 1.5;
    for (let g = 0; g < 5; g++) {
      const p = a + random() * step, q = p + (random() - 0.5) * 5;
      ctx.beginPath();
      if (horizontal) { ctx.moveTo(0, p); ctx.lineTo(512, q); } else { ctx.moveTo(p, 0); ctx.lineTo(q, 512); }
      ctx.stroke();
    }
    ctx.fillStyle = 'rgba(40,22,8,0.6)';
    if (horizontal) ctx.fillRect(0, a, 512, 4); else ctx.fillRect(a, 0, 4, 512);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export default defineThing({
  questions: {
    shape: choice('What shape is the tub?', {
      round: 'A round barrel tub of upright staves, waist high, for one person sitting with knees up.',
      oval: 'A long oval tub, low and generous, for lying back full length.',
      square: 'A square box tub of thick horizontal planks with crisp corners, like a ryokan bath.',
      cauldron: 'A tall narrow barrel set over a small stone hearth with embers under it, the old farmhouse kind.',
    }),
    water: choice('What is the water doing?', {
      still: 'Filled a hand below the rim and perfectly still.',
      brimming: 'Filled to the very lip, trembling, one breath from spilling.',
      overflowing: 'Running over the rim in sheets and pooling on the floor around it.',
      drained: 'Drained and dry, the wood pale inside, waiting or forgotten.',
    }),
    floating: choice('If there is water, what floats in it?', {
      nothing: 'Nothing: clear plain water.',
      yuzu: 'Whole yellow yuzu citrus bobbing, the winter solstice bath.',
      petals: 'A scatter of pink cherry petals.',
      sake: 'A round wooden tray carrying a sake flask and two cups.',
      maple: 'A few red maple leaves blown in from outside.',
      duck: 'One yellow rubber duck.',
    }),
    lid: choice('Where are the lid boards?', {
      off: 'Nowhere in sight: the tub stands open.',
      half: 'Covering the back half, the front open and steaming.',
      on: 'Laid across the whole top, keeping the heat in, steam leaking at the gaps.',
      leaning: 'Taken off and leaned in a stack against the side.',
    }),
    bands: choice('What binds the wood?', {
      iron: 'Flat black iron hoops.',
      copper: 'Bright copper hoops gone warm and rosy.',
      bamboo: 'Thick braided bamboo rope hoops, pale gold.',
    }),
    wood: choice('What does the wood look like?', {
      fresh: 'Fresh pale blond hinoki, almost white, newly made.',
      honey: 'Honey-gold, oiled by years of use.',
      silvered: 'Grey-brown and silvered from standing outdoors.',
      dark: 'Dark smoked cedar, nearly chocolate.',
    }),
    left: choice('What has the bather left on or beside it?', {
      nothing: 'Nothing: nobody has been here.',
      towel: 'A small white towel folded over the rim.',
      ladle: 'A wooden ladle laid across the rim and a little bucket on the floor.',
      robe: 'An indigo cotton robe thrown over the edge.',
      sandals: 'A pair of wooden sandals stepped out of, toes toward the tub.',
    }),
    step: noul('Is there a small wooden step beside it for climbing in?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const r = (lo: number, hi: number) => lo + (hi - lo) * random();

    const woodTone = { fresh: '#ead2a2', honey: '#cf9a52', silvered: '#9a8773', dark: '#6a4a36' }[a.wood];
    const square = a.shape === 'square';
    const H = { round: 0.72, oval: 0.58, square: 0.66, cauldron: 0.92 }[a.shape];
    const R = { round: 0.56, oval: 0.5, square: 0.52, cauldron: 0.42 }[a.shape];
    const sx = a.shape === 'oval' ? 1.45 : 1, sz = a.shape === 'oval' ? 0.88 : 1;
    const base = a.shape === 'cauldron' ? 0.3 : 0;
    const wall = 0.05;
    const top = base + H;

    const wood = s.material(woodTone, { map: boards(random, '#ffffff', square ? 5 : 26, square), roughness: 0.78 });
    const plain = s.material(woodTone, { roughness: 0.8 });
    const inner = s.material(new THREE.Color(woodTone).lerp(new THREE.Color('#f1e2c0'), 0.35), { roughness: 0.85 });
    const band = {
      iron: s.material('#2b2c2e', { metalness: 0.6, roughness: 0.5 }),
      copper: s.material('#c2714a', { metalness: 0.8, roughness: 0.3 }),
      bamboo: s.material('#c9b168', { roughness: 0.7 }),
    }[a.bands];
    const waterTint = new THREE.Color('#bfe2e4').lerp(new THREE.Color('#e6e3c6'), mood.warmth * 0.7);
    const water = new THREE.MeshStandardMaterial({ color: waterTint, roughness: 0.12, metalness: 0.1, emissive: waterTint, emissiveIntensity: 0.18 });
    const wet = new THREE.MeshStandardMaterial({ color: waterTint, roughness: 0.1, transparent: true, opacity: 0.55, depthWrite: false });

    const filled = a.water !== 'drained';
    const level = top - { still: 0.09, brimming: 0.02, overflowing: 0.004, drained: H - 0.1 }[a.water];
    const half = R - wall; // inner half-width

    // The shell.
    if (square) {
      const d = R * 2;
      for (const side of [-1, 1]) {
        s.box([d + 0.06, H, wall], [0, base + H / 2, side * (R - wall / 2)], wood);
        s.box([wall, H, d - wall * 2], [side * (R - wall / 2), base + H / 2, 0], wood);
      }
      s.box([d - 0.02, 0.05, d - 0.02], [0, base + 0.07, 0], inner);
      // A wider cap rail and proud corner posts.
      for (const side of [-1, 1]) {
        s.box([d + 0.12, 0.035, 0.1], [0, top + 0.012, side * (R - 0.035)], plain);
        s.box([0.1, 0.035, d - 0.08], [side * (R - 0.035), top + 0.012, 0], plain);
        for (const other of [-1, 1]) s.box([0.075, H + 0.02, 0.075], [side * R, base + H / 2, other * R], plain);
      }
      for (const y of [0.16, H - 0.16])
        for (const side of [-1, 1]) {
          s.box([d + 0.085, 0.045, 0.012], [0, base + y, side * (R + 0.006)], band);
          s.box([0.012, 0.045, d + 0.085], [side * (R + 0.04), base + y, 0], band);
        }
      for (const x of [-1, 1]) s.box([0.09, 0.05, d], [x * R * 0.6, 0.025, 0], plain);
    } else {
      const taper = a.shape === 'cauldron' ? 0.03 : 0.05;
      const shell = new THREE.LatheGeometry([
        [0, base + 0.02], [R - taper, base + 0.02], [R, top], [R - wall, top], [R - wall - taper * 0.7, base + 0.1], [0, base + 0.1],
      ].map(([x, y]) => new THREE.Vector2(x, y)), 52);
      shell.scale(sx, 1, sz);
      // Wrap the stave texture only around the outside: the inside takes the plain colour.
      const mesh = s.mesh(shell, wood);
      mesh.material = wood;
      const hoops = a.shape === 'cauldron' ? [0.14, 0.5, 0.8] : [0.2, 0.74];
      for (const f of hoops) {
        const rr = R - taper * (1 - f) + (a.bands === 'bamboo' ? 0.012 : 0.004);
        const hoop = new THREE.TorusGeometry(rr, a.bands === 'bamboo' ? 0.022 : 0.012, a.bands === 'bamboo' ? 8 : 4, 64);
        hoop.rotateX(Math.PI / 2);
        if (a.bands !== 'bamboo') hoop.scale(1, 2.6, 1);
        hoop.scale(sx, 1, sz);
        s.mesh(hoop, band, [0, base + H * f, 0]);
      }
      if (a.shape === 'cauldron') {
        // The hearth: a ring of rough stones with a stoke hole and embers.
        const stone = s.material('#6f6a66', { roughness: 0.95 });
        for (let i = 0; i < 11; i++) {
          const t = (i / 11) * Math.PI * 2 + 0.3;
          if (Math.abs(t - Math.PI / 2) < 0.38) continue; // the stoke hole faces +z
          s.ball([r(0.12, 0.16), r(0.15, 0.19), r(0.12, 0.15)], [Math.cos(t) * (R + 0.02), 0.13, Math.sin(t) * (R + 0.02)], stone, 8).rotation.y = r(0, 3);
        }
        s.cylinder(R - 0.02, R + 0.02, 0.07, [0, 0.29, 0], s.material('#3a3b3d', { metalness: 0.5 }), 32);
        const glow = mix(0.5, 2.4, mood.warmth);
        const ember = new THREE.MeshStandardMaterial({ color: '#ff7a2a', emissive: '#ff5a14', emissiveIntensity: glow, roughness: 0.8 });
        for (let i = 0; i < 7; i++) s.ball([r(0.04, 0.07), 0.04, r(0.04, 0.07)], [r(-0.16, 0.16), 0.04, R * 0.5 + r(-0.1, 0.2)], ember, 6);
        for (let i = 0; i < 3; i++) s.rod([r(-0.2, 0.1), 0.05, R * 0.3], [r(-0.1, 0.25), 0.07, R + r(0.15, 0.3)], 0.03, s.material('#3b2a1e'));
      } else for (const x of [-1, 1]) s.box([0.09, 0.04, R * 1.5 * sz], [x * R * 0.55 * sx, 0.02, 0], plain);
    }

    // A place on the water, inside the walls.
    const spot = (margin = 0.1): [number, number] => {
      if (square) return [r(-1, 1) * (half - margin), r(-1, 1) * (half - margin)];
      const t = random() * Math.PI * 2, d = Math.sqrt(random()) * (half - margin - 0.03);
      return [Math.cos(t) * d * sx, Math.sin(t) * d * sz];
    };

    if (filled) {
      const surface = square ? new THREE.BoxGeometry(half * 2, 0.02, half * 2) : new THREE.CylinderGeometry(half - 0.01, half - 0.01, 0.02, 48).scale(sx, 1, sz);
      s.mesh(surface, water, [0, level - 0.01, 0]).castShadow = false;
    }

    const covered = a.lid === 'on';
    if (filled && !covered) {
      const frontOnly = a.lid === 'half';
      const place = (margin: number): [number, number] => { for (let i = 0; i < 12; i++) { const p = spot(margin); if (!frontOnly || p[1] > 0.04) return p; } return [0, half * 0.5 * sz]; };
      const count = (lo: number, hi: number) => Math.round(mix(lo, hi, mood.density) + r(-0.5, 0.5));
      if (a.floating === 'yuzu') {
        const peel = s.material('#f2c230', { roughness: 0.6 });
        const stalk = s.material('#56702c');
        for (let i = 0, n = count(3, 13); i < n; i++) {
          const [x, z] = place(0.09), size = r(0.042, 0.058);
          s.ball([size, size * 0.86, size], [x, level + size * 0.25, z], peel, 12);
          s.cylinder(0.006, 0.006, 0.012, [x + r(-0.01, 0.01), level + size * 1.08, z], stalk, 6);
        }
      } else if (a.floating === 'petals' || a.floating === 'maple') {
        const leaf = a.floating === 'maple';
        const shape = new THREE.Shape();
        if (leaf) for (let i = 0; i < 14; i++) { const t = (i / 14) * Math.PI * 2, d = i % 2 ? 0.35 : 1; if (i) shape.lineTo(Math.cos(t) * d, Math.sin(t) * d); else shape.moveTo(d, 0); }
        else shape.ellipse(0, 0, 1, 0.62, 0, Math.PI * 2);
        const flat = new THREE.ShapeGeometry(shape).rotateX(-Math.PI / 2);
        const n = leaf ? count(3, 9) : count(14, 60);
        const tints = leaf ? ['#c8321e', '#e0652a', '#a3211b'] : ['#f6c3d0', '#fbdde4', '#ef9fb6'];
        const bits = new THREE.InstancedMesh(flat, new THREE.MeshStandardMaterial({ roughness: 0.8, side: THREE.DoubleSide }), n);
        const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
        for (let i = 0; i < n; i++) {
          const [x, z] = place(0.06), size = leaf ? r(0.05, 0.075) : r(0.016, 0.026);
          bits.setMatrixAt(i, m.compose(new THREE.Vector3(x, level + 0.003 + i * 0.0002, z), q.setFromEuler(e.set(0, r(0, 6.3), 0)), new THREE.Vector3(size, size, size)));
          bits.setColorAt(i, new THREE.Color(tints[Math.floor(random() * tints.length)]));
        }
        s.root.add(bits);
      } else if (a.floating === 'sake') {
        const [x, z] = frontOnly ? [0, half * 0.5 * sz] : [r(-0.1, 0.1) * sx, r(-0.08, 0.12)];
        s.cylinder(0.15, 0.14, 0.025, [x, level + 0.012, z], s.material('#7b2a1f', { roughness: 0.35 }), 28);
        const clay = s.material('#e8e4d8', { roughness: 0.4 });
        s.lathe([[0, 0], [0.035, 0], [0.042, 0.05], [0.03, 0.085], [0.014, 0.1], [0.014, 0.125], [0.022, 0.135]], clay, [x - 0.04, level + 0.025, z - 0.02]);
        s.cylinder(0.022, 0.014, 0.025, [x + 0.06, level + 0.037, z + 0.04], clay, 12);
        s.cylinder(0.022, 0.014, 0.025, [x + 0.03, level + 0.037, z - 0.08], clay, 12);
        s.ring(0.042, 0.004, [x - 0.04, level + 0.072, z - 0.02], s.material('#2d4f86')).rotation.x = Math.PI / 2;
      } else if (a.floating === 'duck') {
        const [x, z] = place(0.14), yellow = s.material('#f7d21e', { roughness: 0.35 });
        const turn = r(-0.9, 0.9);
        const duck = new THREE.Group();
        const part = (mesh: THREE.Mesh) => { duck.add(mesh); return mesh; };
        part(s.ball([0.06, 0.045, 0.075], [0, 0.03, 0], yellow, 14));
        part(s.ball([0.038, 0.038, 0.038], [0, 0.085, 0.045], yellow, 14));
        part(s.ball([0.02, 0.008, 0.022], [0, 0.078, 0.085], s.material('#f0762a'), 8));
        part(s.ball([0.03, 0.03, 0.02], [0, 0.055, -0.07], yellow, 8));
        for (const side of [-1, 1]) part(s.ball([0.006, 0.006, 0.006], [side * 0.022, 0.097, 0.073], s.material('#1b1b1b'), 6));
        duck.position.set(x, level, z);
        duck.rotation.y = turn;
        s.root.add(duck);
      }
    }

    // Lid boards: planks cut to the tub's outline, with two cleats to lift them by.
    const plankW = 0.15;
    const reach = (z: number) => (square ? R + 0.03 : Math.sqrt(Math.max(0.01, R * R - (z / sz) ** 2)) * sx + 0.025);
    const planks: number[] = [];
    for (let z = -R * sz + plankW / 2 - 0.02; z < R * sz; z += plankW + 0.006) planks.push(z);
    if (a.lid === 'on' || a.lid === 'half') {
      for (const z of planks) {
        if (a.lid === 'half' && z > -0.03) continue;
        const skew = r(-0.012, 0.012);
        const plank = s.box([reach(Math.abs(z) + plankW * 0.3) * 2, 0.024, plankW], [0, top + 0.03 + (square ? 0.018 : 0), z], plain);
        plank.rotation.y = skew;
      }
      const span = a.lid === 'half' ? R * sz * 0.8 : R * sz * 1.5;
      const mid = a.lid === 'half' ? -R * sz * 0.52 : 0;
      for (const x of [-1, 1]) s.box([0.05, 0.03, span], [x * R * sx * 0.42, top + 0.058 + (square ? 0.018 : 0), mid], plain);
    } else if (a.lid === 'leaning') {
      const n = Math.min(5, planks.length);
      for (let i = 0; i < n; i++) {
        const long = reach(planks[i + 1] ?? 0) * 2;
        const plank = s.box([plankW, long, 0.024], [-R * sx * 0.95 + i * 0.07 + r(-0.02, 0.02), long / 2 * 0.97, R * sz * 0.55 + 0.2 + i * 0.03], plain);
        plank.rotation.x = -0.24;
        plank.rotation.z = r(-0.05, 0.05);
      }
    }

    // Overflow: sheets down the outside and a wide shining puddle.
    if (a.water === 'overflowing') {
      for (let i = 0, n = 4 + Math.floor(random() * 3); i < n; i++) {
        const t = (i / n) * Math.PI * 2 + r(-0.3, 0.3), wide = r(0.25, 0.6);
        if (square) {
          const side = Math.round(t / (Math.PI / 2)) % 4, off = r(-0.25, 0.25) * R;
          const dir: [number, number] = [[1, 0], [0, 1], [-1, 0], [0, -1]][side] as [number, number];
          const sheet = s.box([dir[0] ? 0.012 : wide * 0.7, H, dir[1] ? 0.012 : wide * 0.7], [dir[0] * (R + 0.012) + dir[1] * off, base + H / 2, dir[1] * (R + 0.012) + dir[0] * off], wet);
          sheet.castShadow = false;
        } else {
          const sheet = new THREE.CylinderGeometry(R + 0.008, R - 0.04, H, 12, 1, true, t, wide).scale(sx, 1, sz);
          s.mesh(sheet, wet, [0, base + H / 2 + 0.005, 0]).castShadow = false;
        }
      }
      const pool = new THREE.Shape();
      for (let i = 0; i <= 40; i++) {
        const t = (i / 40) * Math.PI * 2, d = (R + 0.28 + Math.sin(t * 3 + random()) * 0.08 + Math.sin(t * 5) * 0.05);
        if (i) pool.lineTo(Math.cos(t) * d * sx, Math.sin(t) * d * (square ? 1 : sz + 0.1)); else pool.moveTo(d * sx, 0);
      }
      const puddle = s.mesh(new THREE.ShapeGeometry(pool).rotateX(-Math.PI / 2), wet, [0, 0.004, 0]);
      puddle.castShadow = false;
    }

    // What the bather left.
    const rimX = R * sx * 0.72, rimZ = square ? R : Math.sqrt(Math.max(0, 1 - 0.72 * 0.72)) * R * sz;
    if (a.left === 'towel') {
      const cloth = s.material('#f4f1ea', { roughness: 0.95 });
      const g = new THREE.Group();
      const flap = (size: P3, at: P3) => { const m = s.box(size, at, cloth); g.add(m); };
      flap([0.2, 0.014, 0.1], [0, top + 0.03, 0]);
      flap([0.2, 0.2, 0.014], [0, top - 0.065, 0.055]);
      flap([0.2, 0.09, 0.014], [0, top - 0.01, -0.05]);
      const stripe = s.box([0.2, 0.02, 0.016], [0, top - 0.13, 0.056], s.material('#3a5c94'));
      g.add(stripe);
      g.position.set(rimX, 0, rimZ - 0.03);
      g.rotation.y = square ? 0 : Math.atan2(rimX / sx, rimZ / sz);
      s.root.add(g);
    } else if (a.left === 'ladle') {
      s.rod([-rimX * 0.2, top + 0.05, rimZ + 0.12], [rimX * 0.9, top + 0.05, rimZ - 0.3], 0.011, plain);
      s.cylinder(0.05, 0.045, 0.07, [rimX * 0.9, top + 0.045, rimZ - 0.3], plain, 16);
      s.cylinder(0.13, 0.11, 0.16, [R * sx + 0.26, 0.08, R * sz * 0.5], wood, 20);
      s.ring(0.123, 0.007, [R * sx + 0.26, 0.11, R * sz * 0.5], band).rotation.x = Math.PI / 2;
    } else if (a.left === 'robe') {
      const indigo = s.material('#2c406f', { roughness: 0.95 });
      const g = new THREE.Group();
      const fold = (size: P3, at: P3, tilt = 0) => { const m = s.box(size, at, indigo); m.rotation.x = tilt; g.add(m); return m; };
      const pale = s.material('#e9e6dc');
      fold([0.36, 0.03, 0.15], [0, top + 0.04, -0.01]);
      // The body hangs in three soft pleats, a sleeve trails to one side, the collar shows white.
      for (let i = 0; i < 3; i++) fold([0.125, H * r(0.55, 0.72), 0.03], [-0.12 + i * 0.12, top - H * 0.3, 0.085 + (i % 2) * 0.014], 0.05 + i * 0.02).rotation.z = (i - 1) * 0.07;
      fold([0.3, 0.2, 0.025], [0.03, top - 0.07, -0.075], -0.1);
      fold([0.15, H * 0.42, 0.03], [0.25, top - H * 0.2, 0.08], 0.12).rotation.z = 0.5;
      const collar = s.box([0.05, H * 0.5, 0.012], [-0.06, top - H * 0.2, 0.108], pale); collar.rotation.z = 0.12; g.add(collar);
      const sash = s.box([0.05, H * 0.75, 0.014], [0.14, top - H * 0.36, 0.112], s.material('#b23a3a')); sash.rotation.z = -0.1; g.add(sash);
      g.position.set(rimX * 0.9, 0, rimZ - 0.02);
      g.rotation.y = square ? 0 : Math.atan2(rimX / sx, rimZ / sz) * 0.9;
      s.root.add(g);
    } else if (a.left === 'sandals') {
      const strap = s.material('#7a2230');
      for (const side of [-1, 1]) {
        const g = new THREE.Group();
        const add = (m: THREE.Mesh) => g.add(m);
        add(s.box([0.09, 0.018, 0.23], [0, 0.05, 0], plain));
        for (const z of [-0.05, 0.06]) add(s.box([0.085, 0.045, 0.022], [0, 0.022, z], plain));
        add(s.rod([0, 0.06, 0.07], [0.04, 0.075, -0.02], 0.007, strap));
        add(s.rod([0, 0.06, 0.07], [-0.04, 0.075, -0.02], 0.007, strap));
        g.position.set(rimX * 0.5 + side * 0.075, 0, R * sz + (a.step ? 0.52 : 0.3) + r(-0.03, 0.03));
        g.rotation.y = Math.PI + r(-0.2, 0.2);
        s.root.add(g);
      }
    }
    if (a.step) {
      const x = a.shape === 'cauldron' ? -R - 0.1 : 0.05, z = a.shape === 'cauldron' ? R * 0.75 : R * sz + 0.2;
      s.box([0.46, 0.035, 0.24], [x, 0.2, z], plain);
      for (const side of [-1, 1]) s.box([0.035, 0.2, 0.22], [x + side * 0.19, 0.1, z], plain);
      s.box([0.36, 0.05, 0.03], [x, 0.1, z], plain);
    }
    if (mood.wear > 0.55) {
      // Old tubs go green and black at the foot.
      const moss = s.material('#55683a', { roughness: 1 });
      for (let i = 0, n = Math.round((mood.wear - 0.5) * 30); i < n; i++) {
        const t = random() * Math.PI * 2, d = square ? R * 1.05 / Math.max(Math.abs(Math.cos(t)), Math.abs(Math.sin(t))) : R - 0.03;
        s.ball([r(0.03, 0.07), r(0.02, 0.05), r(0.02, 0.03)], [Math.cos(t) * d * sx, base + r(0.02, 0.2), Math.sin(t) * d * sz], moss, 6).rotation.y = -t + Math.PI / 2;
      }
    }

    // Steam: soft shaded puffs that rise, swell and thin out.
    const amount = !filled ? 0 : covered ? 0.3 : a.lid === 'half' ? 0.7 : 1;
    const puffCount = Math.round(amount * mix(9, 22, mood.energy * 0.5 + (a.water === 'overflowing' ? 0.5 : 0.2)));
    const mist = new THREE.MeshStandardMaterial({ color: '#ffffff', transparent: true, opacity: 0.3, depthWrite: false, roughness: 1, emissive: '#aebccb', emissiveIntensity: 0.35 });
    const puffGeometry = new THREE.IcosahedronGeometry(1, 2);
    const puffs = Array.from({ length: puffCount }, (_unused, i) => {
      const mesh = new THREE.Mesh(puffGeometry, mist);
      s.root.add(mesh);
      let [x, z] = spot(0.12);
      if (covered) { const t = random() * Math.PI * 2; x = Math.cos(t) * R * sx; z = Math.sin(t) * R * sz; }
      else if (a.lid === 'half') z = Math.abs(z) + 0.05;
      return { mesh, x, z, phase: (i + random()) / Math.max(puffCount, 1), size: r(0.1, 0.19) * (covered ? 0.6 : 1), sway: r(0, 6.3) };
    });
    const rise = mix(0.7, 1.3, mood.energy) * (covered ? 0.5 : 1);
    const lean = r(-0.25, 0.25);
    const pose = (time: number) => {
      for (const p of puffs) {
        const t = (p.phase + time * 0.07 * mix(0.6, 1.8, mood.energy)) % 1;
        p.mesh.position.set(p.x + (lean * t + Math.sin(p.sway + t * 4) * 0.05) * t, level + 0.05 + t * rise, p.z + Math.cos(p.sway + t * 3) * 0.05 * t);
        p.mesh.scale.setScalar(p.size * (0.5 + t * 1.5) * Math.sin(Math.PI * Math.min(1, t * 1.15)) ** 0.5 + 0.001);
      }
    };
    pose(0);
    return s.finish({ footprint: R * Math.max(sx, sz) + 0.25, update: (_dt, time) => pose(time) });
  },
});
