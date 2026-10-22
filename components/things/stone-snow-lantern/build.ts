import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix } from '@conjure/kit';

type P3 = [number, number, number];

export default defineThing({
  questions: {
    style: choice('What style of lantern is it?', {
      yukimi: 'A snow-viewing lantern: low and squat on splayed curved legs, with a cap much wider than its body.',
      pedestal: 'A tall formal shrine lantern on a round pedestal post, with an upswept roof and an onion finial.',
      natural: 'Rough unshaped stones balanced one on another: a boulder, a slab, a hollowed rock, a flat capstone.',
      buried: 'A plain square post sunk straight into the ground with a small square roof, the tea-garden kind.',
    }),
    light: choice('Is it lit?', {
      candle: 'One candle inside, a small warm wavering glow.',
      bright: 'Burning strongly, every window gold.',
      out: 'Just gone out: dark windows and a thread of smoke.',
      dark: 'Dark and cold, not lit in years.',
    }),
    cover: choice('What has settled on it?', {
      bare: 'Nothing: clean stone.',
      dusting: 'A light dusting of snow on the cap.',
      heaped: 'Deep snow heaped on the cap and every ledge, rounded like a loaf.',
      moss: 'Thick green moss on the cap and creeping up the base.',
      leaves: 'A scatter of red and gold fallen leaves.',
    }),
    window: choice('What shape are the windows?', {
      round: 'Round full moons.',
      square: 'Plain squares.',
      moon: 'A crescent moon on one side and a round sun on the next.',
      lattice: 'Squares crossed with a stone lattice.',
    }),
    stone: choice('What stone is it cut from?', {
      grey: 'Speckled mid-grey granite.',
      pale: 'Pale, almost white granite.',
      dark: 'Dark blue-black basalt.',
      rose: 'Weathered pinkish-brown stone.',
    }),
    company: choice('What keeps it company?', {
      nothing: 'Nothing.',
      bird: 'A small round bird perched on the cap.',
      snowman: 'A tiny snowman somebody built beside it.',
      camellia: 'A red camellia flower dropped at its foot.',
      coins: 'A few coins left on its ledge.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const r = (lo: number, hi: number) => lo + (hi - lo) * random();

    // Speckled granite, painted once and shared.
    const tone = { grey: '#8f908d', pale: '#cfcdc6', dark: '#4b4f58', rose: '#a98a7c' }[a.stone];
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 256;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 2600; i++) {
      const v = Math.floor(r(120, 255));
      ctx.fillStyle = `rgba(${v},${v},${v},${r(0.25, 0.8)})`;
      ctx.fillRect(r(0, 256), r(0, 256), r(1, 3.5), r(1, 3.5));
    }
    const speckle = new THREE.CanvasTexture(canvas);
    speckle.colorSpace = THREE.SRGBColorSpace;
    speckle.wrapS = speckle.wrapT = THREE.RepeatWrapping;
    speckle.repeat.set(2, 2);
    const natural = a.style === 'natural';
    const stone = s.material(tone, { map: speckle, roughness: 0.92, flatShading: natural });
    const snow = new THREE.MeshStandardMaterial({ color: '#f6f9fb', roughness: 0.95 });
    const moss = new THREE.MeshStandardMaterial({ color: '#5c7a34', roughness: 1 });
    const lit = a.light === 'candle' || a.light === 'bright';
    const power = a.light === 'bright' ? mix(1.6, 3.2, mood.warmth) : mix(0.9, 2.0, mood.warmth);
    const pane = new THREE.MeshStandardMaterial(lit
      ? { color: '#ffd98a', emissive: a.light === 'bright' ? '#ffb347' : '#ff9a3a', emissiveIntensity: power, roughness: 0.6 }
      : { color: '#191a1c', roughness: 0.9 });

    const hex = (top: number, bottom: number, height: number, at: P3, sides = 6) => {
      const mesh = s.mesh(new THREE.CylinderGeometry(top, bottom, height, sides).rotateY(Math.PI / sides), stone, at);
      return mesh;
    };
    const roofOf = (profile: [number, number][], sides: number, at: P3, material: THREE.Material = stone) =>
      s.mesh(new THREE.LatheGeometry(profile.map(([x, y]) => new THREE.Vector2(x, y)), sides).rotateY(Math.PI / sides), material, at);
    const rough = (size: P3, at: P3, detail = 1) => {
      const g = new THREE.IcosahedronGeometry(1, detail), pos = g.attributes.position, k = r(0, 9);
      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
        const f = 1 + 0.12 * Math.sin(x * 5 + k) * Math.cos(y * 4 + k * 2) + 0.08 * Math.sin(z * 7 + k * 3);
        pos.setXYZ(i, x * f, y * f, z * f);
      }
      g.computeVertexNormals();
      const mesh = s.mesh(g, stone, at);
      mesh.scale.set(...size);
      mesh.rotation.y = r(0, 3);
      return mesh;
    };

    // Each style reports where its firebox, cap and ledges are, so the windows, snow and company can find them.
    let box = { y: 0, half: 0.15, height: 0.2, sides: 6 };
    let cap = { y: 0, radius: 0.4, top: 0.2, sides: 6 };
    let ledge = { y: 0, radius: 0.25 };
    let foot = 0.3;

    if (a.style === 'yukimi') {
      const legs = random() < 0.5 ? 3 : 4;
      const py = 0.4;
      for (let i = 0; i < legs; i++) {
        const t = (i / legs) * Math.PI * 2 + Math.PI / legs + 0.35;
        const pts: P3[] = [[0.13, py, 0], [0.25, py - 0.1, 0], [0.34, py - 0.27, 0], [0.37, 0, 0]];
        s.tube(pts.map(([x, y]) => [Math.cos(t) * x, y, Math.sin(t) * x] as P3), 0.045, stone);
        s.ball([0.06, 0.03, 0.06], [Math.cos(t) * 0.375, 0.02, Math.sin(t) * 0.375], stone, 10);
      }
      hex(0.33, 0.29, 0.07, [0, py + 0.035, 0]);
      hex(0.22, 0.22, 0.32, [0, py + 0.23, 0]);
      box = { y: py + 0.23, half: 0.22, height: 0.32, sides: 6 };
      const cy = py + 0.39;
      roofOf([[0, 0.02], [0.44, 0], [0.46, 0.035], [0.36, 0.08], [0.22, 0.14], [0.1, 0.2], [0.07, 0.24], [0, 0.25]], 6, [0, cy, 0]);
      s.lathe([[0, 0], [0.05, 0], [0.075, 0.035], [0.05, 0.08], [0, 0.1]], stone, [0, cy + 0.235, 0]);
      cap = { y: cy, radius: 0.46, top: 0.25, sides: 6 };
      ledge = { y: py + 0.07, radius: 0.3 };
      foot = 0.4;
    } else if (a.style === 'pedestal') {
      hex(0.28, 0.33, 0.1, [0, 0.05, 0]);
      hex(0.2, 0.26, 0.07, [0, 0.135, 0]);
      s.cylinder(0.085, 0.1, 0.72, [0, 0.53, 0], stone, 20);
      s.ring(0.1, 0.02, [0, 0.53, 0], stone).rotation.x = Math.PI / 2;
      roofOf([[0, 0], [0.1, 0], [0.26, 0.11], [0.26, 0.15], [0, 0.15]], 6, [0, 0.87, 0]);
      hex(0.15, 0.15, 0.24, [0, 1.14, 0]);
      box = { y: 1.14, half: 0.15, height: 0.24, sides: 6 };
      roofOf([[0, 0.0], [0.36, 0.03], [0.4, 0.09], [0.3, 0.085], [0.17, 0.16], [0.08, 0.26], [0, 0.27]], 6, [0, 1.25, 0]);
      s.lathe([[0, 0], [0.045, 0], [0.085, 0.05], [0.06, 0.11], [0.015, 0.17], [0, 0.18]], stone, [0, 1.5, 0]);
      cap = { y: 1.26, radius: 0.4, top: 0.27, sides: 6 };
      ledge = { y: 1.02, radius: 0.23 };
      foot = 0.38;
    } else if (a.style === 'natural') {
      rough([0.34, 0.2, 0.3], [0, 0.16, 0]);
      rough([0.15, 0.2, 0.14], [r(-0.02, 0.02), 0.48, r(-0.02, 0.02)]);
      rough([0.3, 0.055, 0.27], [0, 0.69, 0]);
      const fire = s.mesh(new THREE.BoxGeometry(0.3, 0.26, 0.3, 2, 2, 2), stone, [0, 0.86, 0]);
      const fp = fire.geometry.attributes.position;
      for (let i = 0; i < fp.count; i++) fp.setXYZ(i, fp.getX(i) * (1 + 0.1 * Math.sin(i * 1.7)), fp.getY(i), fp.getZ(i) * (1 + 0.1 * Math.cos(i * 2.3)));
      fire.geometry.computeVertexNormals();
      box = { y: 0.86, half: 0.158, height: 0.26, sides: 4 };
      rough([0.37, 0.09, 0.33], [0.02, 1.06, 0], 2);
      cap = { y: 1.04, radius: 0.34, top: 0.11, sides: 12 };
      ledge = { y: 0.745, radius: 0.24 };
      foot = 0.4;
    } else {
      s.box([0.17, 0.7, 0.17], [0, 0.35, 0], stone);
      s.box([0.2, 0.2, 0.2], [0, 0.52, 0], stone);
      // The carved figure the tea masters liked, as a shallow niche.
      s.box([0.09, 0.2, 0.01], [0, 0.22, 0.086], new THREE.MeshStandardMaterial({ color: new THREE.Color(tone).multiplyScalar(0.6), roughness: 1 }));
      s.box([0.32, 0.05, 0.32], [0, 0.725, 0], stone);
      s.box([0.24, 0.22, 0.24], [0, 0.86, 0], stone);
      box = { y: 0.86, half: 0.12, height: 0.22, sides: 4 };
      roofOf([[0, 0], [0.3, 0.0], [0.31, 0.04], [0.16, 0.14], [0.07, 0.19], [0, 0.2]], 4, [0, 0.97, 0]);
      s.lathe([[0, 0], [0.04, 0], [0.06, 0.03], [0.03, 0.08], [0, 0.09]], stone, [0, 1.16, 0]);
      cap = { y: 0.97, radius: 0.31, top: 0.2, sides: 4 };
      ledge = { y: 0.75, radius: 0.17 };
      foot = 0.22;
    }

    // Windows on every face of the firebox.
    const bar = new THREE.MeshStandardMaterial({ color: new THREE.Color(tone).multiplyScalar(0.85), roughness: 0.95 });
    const apothem = box.sides === 6 ? box.half * Math.cos(Math.PI / 6) : box.half;
    const faceW = box.sides === 6 ? box.half * 0.78 : box.half * 1.3;
    const size = Math.min(faceW, box.height * 0.62);
    for (let i = 0; i < box.sides; i++) {
      const phi = (i / box.sides) * Math.PI * 2;
      const face = new THREE.Group();
      face.position.set(Math.sin(phi) * (apothem + 0.004), box.y - box.height * 0.1, Math.cos(phi) * (apothem + 0.004));
      face.rotation.y = phi;
      s.root.add(face);
      const kind = a.window === 'moon' ? (i % 2 ? 'sun' : 'crescent') : a.window;
      let geometry: THREE.BufferGeometry;
      if (kind === 'round' || kind === 'sun') geometry = new THREE.CircleGeometry(size * 0.5, 20);
      else if (kind === 'crescent') {
        const moon = new THREE.Shape();
        moon.absarc(0, 0, size * 0.52, -Math.PI * 0.5, Math.PI * 0.5, false);
        moon.absellipse(0, 0, size * 0.24, size * 0.52, Math.PI * 0.5, -Math.PI * 0.5, true, 0);
        geometry = new THREE.ShapeGeometry(moon, 12).translate(-size * 0.2, 0, 0);
      } else geometry = new THREE.PlaneGeometry(size * 0.92, size * 0.92);
      face.add(new THREE.Mesh(geometry, pane));
      if (kind === 'lattice') for (const k of [-1, 0, 1]) {
        const v = new THREE.Mesh(new THREE.BoxGeometry(size * 0.07, size * 0.92, 0.008), bar), h = new THREE.Mesh(new THREE.BoxGeometry(size * 0.92, size * 0.07, 0.008), bar);
        v.position.x = k * size * 0.3;
        h.position.y = k * size * 0.3;
        face.add(v, h);
      }
    }
    let halo: THREE.Mesh | null = null;
    if (lit) {
      // A pool of thrown light on the ground rather than a ball of glow in the air.
      halo = new THREE.Mesh(new THREE.CircleGeometry(1, 28).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: '#ffb650', transparent: true, opacity: a.light === 'bright' ? 0.17 : 0.1, depthWrite: false }));
      halo.scale.setScalar(foot * (a.light === 'bright' ? 1.7 : 1.35));
      halo.position.y = 0.004;
      s.root.add(halo);
    } else if (a.light === 'out') {
      const smoke = new THREE.MeshStandardMaterial({ color: '#8d9299', transparent: true, opacity: 0.4, depthWrite: false, roughness: 1 });
      const sx = Math.sin(0.5) * (apothem + 0.03), sz = Math.cos(0.5) * (apothem + 0.03);
      const wisp = s.tube([[sx, box.y + 0.03, sz], [sx + 0.03, box.y + 0.14, sz + 0.03], [sx - 0.02, box.y + 0.3, sz + 0.05], [sx + 0.04, box.y + 0.5, sz + 0.03], [sx, box.y + 0.68, sz + 0.06]], 0.008, smoke);
      wisp.castShadow = false;
    }

    // What has settled.
    const topY = cap.y + cap.top;
    const onCap = (reach = 0.85): P3 => { const t = r(0, 6.3), d = Math.sqrt(random()) * reach; return [Math.cos(t) * d * cap.radius, cap.y + cap.top * (1 - d * 0.82) + 0.01, Math.sin(t) * d * cap.radius]; };
    if (a.cover === 'dusting' || a.cover === 'heaped') {
      const deep = a.cover === 'heaped' ? 1 : 0.22;
      const t = 0.03 + 0.09 * deep, R = cap.radius;
      roofOf(([[0, cap.top + t * 1.15 + (a.style === 'natural' ? 0 : 0.03)], [R * 0.35, cap.top * 0.72 + t * 1.1], [R * 0.7, cap.top * 0.34 + t], [R * 0.95, cap.top * 0.14 + t * 0.6], [R * 1.02, cap.top * 0.1], [R * 0.9, cap.top * 0.06]] as [number, number][]).reverse(), natural ? 14 : Math.max(cap.sides * 2, 12), [0, cap.y, 0], snow);
      if (deep === 1) {
        const rim = new THREE.Mesh(new THREE.TorusGeometry(ledge.radius * 0.8, 0.035, 6, 20), snow);
        rim.rotation.x = Math.PI / 2;
        rim.position.y = ledge.y + 0.015;
        rim.scale.z = 0.7;
        s.root.add(rim);
        for (let i = 0; i < 8; i++) { const t2 = r(0, 6.3), d = foot * r(0.85, 1.25); s.ball([r(0.1, 0.17), r(0.035, 0.07), r(0.09, 0.15)], [Math.cos(t2) * d, 0.01, Math.sin(t2) * d], snow, 10); }
      }
    } else if (a.cover === 'moss') {
      for (let i = 0; i < 34; i++) { const p = onCap(0.95); s.ball([r(0.03, 0.065), r(0.012, 0.022), r(0.03, 0.06)], p, moss, 7); }
      for (let i = 0; i < 12; i++) { const t = r(0, 6.3), d = foot * r(0.7, 1.0); s.ball([r(0.04, 0.08), r(0.02, 0.035), r(0.04, 0.07)], [Math.cos(t) * d, 0.01, Math.sin(t) * d], moss, 7); }
    } else if (a.cover === 'leaves') {
      const leaf = new THREE.Shape();
      for (let i = 0; i < 14; i++) { const t = (i / 14) * Math.PI * 2, d = i % 2 ? 0.35 : 1; if (i) leaf.lineTo(Math.cos(t) * d, Math.sin(t) * d); else leaf.moveTo(d, 0); }
      const n = Math.round(mix(10, 30, mood.density));
      const tints = ['#c8321e', '#e0842a', '#e2b53a', '#a3211b'];
      const leaves = new THREE.InstancedMesh(new THREE.ShapeGeometry(leaf).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ roughness: 0.8, side: THREE.DoubleSide }), n);
      const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
      for (let i = 0; i < n; i++) {
        const up = i % 3 !== 0, p: P3 = up ? onCap(0.9) : [r(-1, 1) * foot * 1.4, 0.006 + i * 0.0005, r(-1, 1) * foot * 1.4];
        const d = Math.hypot(p[0], p[2]) || 1;
        e.set(up ? r(-0.2, 0.2) : 0, r(0, 6.3), up ? -cap.top / cap.radius * 0.7 : 0);
        if (up) e.set(0, Math.atan2(-p[2], p[0]), -Math.atan(cap.top / cap.radius) * 0.8, 'YZX');
        void d;
        leaves.setMatrixAt(i, m.compose(new THREE.Vector3(...p), q.setFromEuler(e), new THREE.Vector3(1, 1, 1).multiplyScalar(r(0.035, 0.055))));
        leaves.setColorAt(i, new THREE.Color(tints[Math.floor(random() * tints.length)]));
      }
      leaves.castShadow = true;
      s.root.add(leaves);
    }
    // Age: lichen blotches regardless of weather.
    if (mood.wear > 0.45) {
      const lichen = new THREE.MeshStandardMaterial({ color: '#b9bd8f', roughness: 1 });
      for (let i = 0; i < Math.round((mood.wear - 0.4) * 22); i++) { const t = r(0, 6.3); s.ball([r(0.02, 0.045), r(0.02, 0.045), 0.008], [Math.sin(t) * (apothem + 0.005), box.y + r(-0.5, 0.5) * box.height - (random() < 0.5 ? box.height * 1.2 : 0), Math.cos(t) * (apothem + 0.005)], lichen, 6).rotation.y = t; }
    }

    // Company.
    const snowTop = a.cover === 'heaped' ? 0.19 : a.cover === 'dusting' ? 0.06 : 0;
    if (a.company === 'bird') {
      const g = new THREE.Group();
      const add = (size: P3, at: P3, colour: string) => { const m = s.ball(size, at, new THREE.MeshStandardMaterial({ color: colour, roughness: 0.9 }), 12); g.add(m); return m; };
      add([0.05, 0.045, 0.06], [0, 0.045, 0], '#8a6a4c');
      add([0.042, 0.035, 0.04], [0, 0.035, 0.02], '#e9dfd0');
      add([0.033, 0.031, 0.033], [0, 0.092, 0.035], '#5a4232');
      add([0.02, 0.016, 0.012], [0.0, 0.085, 0.062], '#f1ece2');
      const beak = s.mesh(new THREE.ConeGeometry(0.01, 0.028, 6).rotateX(Math.PI / 2), new THREE.MeshStandardMaterial({ color: '#d99a2b' }), [0, 0.09, 0.075]);
      g.add(beak);
      add([0.018, 0.008, 0.05], [0, 0.05, -0.075], '#4d3a2c').rotation.x = -0.4;
      for (const side of [-1, 1]) add([0.006, 0.006, 0.006], [side * 0.02, 0.1, 0.058], '#141414');
      const side = cap.radius * 0.55;
      g.position.set(side * 0.75, cap.y + cap.top * 0.42 + snowTop * 0.75, side * 0.65);
      if (a.style === 'natural') g.position.y = cap.y + cap.top + snowTop * 0.8;
      g.rotation.y = r(-0.4, 1.2);
      s.root.add(g);
    } else if (a.company === 'snowman') {
      const x = foot + 0.16, z = foot * 0.6 + 0.1;
      s.ball([0.1, 0.09, 0.1], [x, 0.085, z], snow, 14);
      s.ball([0.07, 0.065, 0.07], [x, 0.215, z], snow, 14);
      const coal = new THREE.MeshStandardMaterial({ color: '#1d1d1f' });
      for (const side of [-1, 1]) s.ball([0.01, 0.01, 0.01], [x + side * 0.025, 0.235, z + 0.062], coal, 6);
      s.mesh(new THREE.ConeGeometry(0.01, 0.045, 6).rotateX(Math.PI / 2), new THREE.MeshStandardMaterial({ color: '#e0762a' }), [x, 0.215, z + 0.085]);
      const twig = new THREE.MeshStandardMaterial({ color: '#4a3524' });
      for (const side of [-1, 1]) s.rod([x + side * 0.08, 0.11, z], [x + side * 0.19, 0.18 + r(0, 0.05), z + r(-0.03, 0.03)], 0.005, twig);
      s.cylinder(0.035, 0.03, 0.035, [x, 0.285, z], new THREE.MeshStandardMaterial({ color: '#b03434' }), 10);
    } else if (a.company === 'camellia') {
      const x = foot * 0.9, z = foot * 0.9 + 0.08;
      const petal = new THREE.MeshStandardMaterial({ color: '#c4203a', roughness: 0.6 });
      for (let i = 0; i < 6; i++) { const t = (i / 6) * Math.PI * 2; s.ball([0.035, 0.016, 0.035], [x + Math.cos(t) * 0.028, 0.02, z + Math.sin(t) * 0.028], petal, 8); }
      s.ball([0.02, 0.018, 0.02], [x, 0.035, z], new THREE.MeshStandardMaterial({ color: '#f2cb3b' }), 8);
      const green = new THREE.MeshStandardMaterial({ color: '#2f6235', roughness: 0.5 });
      for (const side of [-1, 1]) s.ball([0.05, 0.006, 0.025], [x + side * 0.07, 0.01, z - 0.03], green, 8).rotation.y = side * 0.6;
    } else if (a.company === 'coins') {
      const brass = new THREE.MeshStandardMaterial({ color: '#d2a53c', metalness: 0.8, roughness: 0.3, emissive: '#6b4e10', emissiveIntensity: 0.4 });
      for (let i = 0; i < 5; i++) { const t = r(0.1, 1.4) + (i > 2 ? 3 : 0); s.cylinder(0.018, 0.018, 0.005, [Math.sin(t) * ledge.radius * 0.88, ledge.y + 0.004 + (i % 2) * 0.005, Math.cos(t) * ledge.radius * 0.88], brass, 10); }
    }
    void topY;

    const flicker = a.light === 'bright' ? 0.08 : 0.3;
    return s.finish({
      footprint: foot + 0.12,
      update: (_dt, time) => {
        if (!lit) return;
        const f = 1 + (Math.sin(time * 9.1) * 0.5 + Math.sin(time * 23.7) * 0.3 + Math.sin(time * 3.3) * 0.2) * flicker * mix(0.4, 1.4, mood.energy);
        pane.emissiveIntensity = power * f;
        if (halo) halo.scale.setScalar(foot * (a.light === 'bright' ? 1.7 : 1.35) * (0.96 + 0.04 * f));
      },
    });
  },
});
