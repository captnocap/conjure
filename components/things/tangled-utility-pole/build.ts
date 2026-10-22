import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';
import { flood } from './flood';

type V3 = readonly [number, number, number];

export default defineThing({
  questions: {
    tangle: score('How big is the knot of cables?', ['A few orderly lines', 'A busy bundle', 'A thick black nest', 'A thundercloud of wire swallowing the pole']),
    lean: score('How far is the pole leaning?', ['Dead plumb', 'A tired tilt', 'Leaning badly, held by its stay wire', 'About to come down']),
    light: choice('What is the street light doing?', {
      working: 'Working: a warm sodium glow on the water below.',
      dead: 'Dead and dark.',
      sparking: 'Dark, while the junction below it spits blue-white sparks.',
      dangling: 'Broken off its arm and dangling by its own cable.',
      tube: 'Replaced by a bare fluorescent tube someone wired on by hand.',
    }),
    transformer: choice('What electrical gear hangs on it?', {
      none: 'No transformer, only crossarms and insulators.',
      can: 'A single grey drum transformer bracketed to the side.',
      platform: 'A big finned transformer on a steel platform, with fuse cut-outs above it.',
      boxes: 'A rash of cable-TV and internet junction boxes with coiled spare fibre.',
    }),
    hanging: choice('What else is hanging from the pole and its wires?', {
      nothing: 'Nothing but wire.',
      banners: 'A sagging cloth banner and a string of triangular festival flags.',
      kites: 'Paper kites snagged in the wires, tails trailing.',
      washing: 'A line of washing tied off to it: shirts and a long sari.',
      shoes: 'Pairs of shoes thrown over the wires by their laces.',
      loudspeakers: 'A pair of horn loudspeakers pointing up and down the street.',
      nest: 'A crows\' nest of twigs and wire, and the crows.',
    }),
    notices: choice('What is stuck to the pole at eye level?', {
      bare: 'Nothing, bare concrete with a stencilled number.',
      posters: 'Layers of torn posters and handbills.',
      danger: 'A red danger sign with a lightning bolt.',
      thread: 'Sacred threads, a small picture and a hanging lemon-and-chilli charm.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const H = 7.8;
    const concrete = s.material('#a7a59c', { roughness: 0.95 });
    const steel = s.material('#7d858a', { metalness: 0.6, roughness: 0.5 });
    const grey = s.material('#8b9296', { metalness: 0.4, roughness: 0.55 });
    const black = s.material('#161617', { roughness: 0.75 });
    const porcelain = s.material('#7a3f2a', { roughness: 0.3 });
    const pole = new THREE.Group();
    s.root.add(pole);
    const add = <T extends THREE.Object3D>(object: T, parent: THREE.Object3D = pole) => { object.traverse((node) => { node.castShadow = node.receiveShadow = true; }); parent.add(object); return object; };
    const mesh = (geometry: THREE.BufferGeometry, material: THREE.Material, at: V3 = [0, 0, 0], scale: V3 = [1, 1, 1], parent: THREE.Object3D = pole) => { const m = add(new THREE.Mesh(geometry, material), parent); m.position.set(...at); m.scale.set(...scale); return m; };
    const rod = (from: V3, to: V3, radius: number, material: THREE.Material, parent: THREE.Object3D = pole) => {
      const p = new THREE.Vector3(...from), q = new THREE.Vector3(...to), d = q.clone().sub(p);
      const m = mesh(new THREE.CylinderGeometry(radius, radius, d.length(), 8), material, [0, 0, 0], [1, 1, 1], parent);
      m.position.copy(p.add(q).multiplyScalar(0.5));
      m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
      return m;
    };
    const cube = new THREE.BoxGeometry(1, 1, 1), sphere = new THREE.SphereGeometry(1, 12, 8);

    // ---- the pole itself ----
    const shaft = mesh(new THREE.CylinderGeometry(0.085, 0.16, H, 4), concrete, [0, H / 2, 0]);
    shaft.rotation.y = Math.PI / 4;
    for (let i = 0; i < 9; i++) mesh(cube, s.material('#8f8d85', { roughness: 1 }), [0, 1.4 + i * 0.62, 0], [0.1 + (8 - i) * 0.006, 0.16, 0.26 - i * 0.012]);
    const arms: number[] = [H - 0.35, H - 1.05];
    for (const [k, y] of arms.entries()) {
      mesh(cube, steel, [0, y, 0.09], [1.7 - k * 0.3, 0.07, 0.07]);
      for (const side of [-1, 1]) rod([side * 0.5, y, 0.09], [0, y - 0.45, 0.1], 0.015, steel);
      for (let i = 0; i < 4 - k; i++) {
        const x = (i - (3 - k) / 2) * 0.48;
        mesh(new THREE.CylinderGeometry(0.035, 0.05, 0.14, 10), porcelain, [x, y + 0.1, 0.09]);
        mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.02, 10), porcelain, [x, y + 0.08, 0.09]);
      }
    }
    mesh(new THREE.ConeGeometry(0.1, 0.12, 4), concrete, [0, H + 0.06, 0]).rotation.y = Math.PI / 4;

    // ---- transformer and boxes ----
    if (a.transformer === 'can') {
      mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.75, 18), grey, [0.42, 5.55, 0]);
      mesh(new THREE.CylinderGeometry(0.31, 0.31, 0.04, 18), steel, [0.42, 5.94, 0]);
      for (let i = 0; i < 8; i++) mesh(cube, grey, [0.42 + Math.cos(i * 0.5 - 1.5) * 0.33, 5.5, Math.sin(i * 0.5 - 1.5) * 0.33], [0.02, 0.5, 0.1]).rotation.y = -(i * 0.5 - 1.5);
      for (const z of [-0.12, 0.12]) { mesh(new THREE.CylinderGeometry(0.03, 0.045, 0.22, 8), porcelain, [0.42, 6.06, z]); rod([0.42, 6.16, z], [0.2, H - 1.0, 0.09], 0.008, black); }
      mesh(cube, steel, [0.14, 5.55, 0], [0.3, 0.08, 0.08]);
    } else if (a.transformer === 'platform') {
      mesh(cube, steel, [0.55, 4.0, 0], [1.2, 0.06, 0.8]);
      rod([1.05, 4.0, 0.3], [0.08, 3.0, 0.05], 0.025, steel); rod([1.05, 4.0, -0.3], [0.08, 3.0, -0.05], 0.025, steel);
      mesh(cube, grey, [0.6, 4.55, 0], [0.75, 1.0, 0.55]);
      for (let i = 0; i < 7; i++) for (const side of [-1, 1]) mesh(cube, grey, [0.28 + i * 0.105, 4.5, side * 0.33], [0.02, 0.8, 0.12]);
      mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.4, 10), grey, [0.9, 5.2, 0]).rotation.z = Math.PI / 2;
      for (let i = 0; i < 3; i++) { mesh(new THREE.CylinderGeometry(0.035, 0.05, 0.3, 8), porcelain, [0.36 + i * 0.22, 5.2, 0.12]); rod([0.36 + i * 0.22, 5.34, 0.12], [0.3 + i * 0.1, 6.1, 0.14], 0.008, black); const fuse = rod([0.3 + i * 0.1, 6.1, 0.14], [0.36 + i * 0.1, 6.45, 0.2], 0.022, porcelain); fuse.castShadow = true; }
      mesh(cube, steel, [0.4, 6.3, 0.12], [0.6, 0.05, 0.05]);
      const plate = s.label('DANGER 11000 V', 0.5, 0.16, [0.6, 4.55, 0.278], '#f6f3ea', '#b3261f');
      pole.add(plate);
    } else if (a.transformer === 'boxes') {
      const tints = ['#d9d6cb', '#3a3d40', '#c9c2a8', '#5a6a72', '#e9e6da'];
      for (let i = 0; i < 7; i++) {
        const y = 3.4 + i * 0.36 + random() * 0.1, side = i % 2 ? 1 : -1;
        const boxMesh = mesh(cube, s.material(tints[i % tints.length], { roughness: 0.6 }), [side * 0.02, y, 0.19 + random() * 0.03], [0.24 + random() * 0.12, 0.2 + random() * 0.1, 0.1]);
        boxMesh.rotation.z = (random() - 0.5) * 0.25;
        const loop = mesh(new THREE.TorusGeometry(0.2 + random() * 0.1, 0.014, 5, 18), black, [side * (0.28 + random() * 0.1), y - 0.1, 0.1]);
        loop.rotation.set((random() - 0.5) * 0.5, (random() - 0.5) * 0.8, 0);
        loop.scale.y = 1.3;
      }
    }

    // ---- street light ----
    const flickerers: THREE.MeshStandardMaterial[] = [];
    const armY = 6.15;
    const headAt: V3 = [0, armY + 0.35, 1.5];
    add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(0, armY - 0.5, 0.1), new THREE.Vector3(0, armY, 0.35), new THREE.Vector3(0, armY + 0.32, 0.9), new THREE.Vector3(...headAt)]), 16, 0.028, 6), steel));
    const lit = a.light === 'working';
    const lampGlow = new THREE.MeshStandardMaterial({ color: lit ? '#ffd27a' : '#d9d6cb', emissive: lit ? '#ffab3a' : '#000000', emissiveIntensity: lit ? mix(1.6, 2.8, 1 - Math.abs(mood.daylight - 0.5) * 0.4) : 0, roughness: 0.3 });
    const head = new THREE.Group();
    mesh(sphere, grey, [0, 0, 0.12], [0.13, 0.07, 0.28], head);
    mesh(sphere, lampGlow, [0, -0.035, 0.14], [0.1, 0.05, 0.2], head);
    if (a.light === 'dangling') {
      head.position.set(0.12, armY - 0.75, 1.42);
      head.rotation.set(1.1, 0.4, 0.5);
      rod([0, headAt[1], headAt[2]], [0.1, armY - 0.6, 1.44], 0.008, black);
    } else if (a.light === 'tube') {
      head.visible = false;
      const tube = new THREE.MeshStandardMaterial({ color: '#f1f6ff', emissive: '#dfeaff', emissiveIntensity: 2.2 });
      const lampTube = mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.1, 8), tube, [0, headAt[1] - 0.06, headAt[2] - 0.3]);
      lampTube.rotation.x = Math.PI / 2 - 0.25;
      mesh(cube, s.material('#e9e6da'), [0, headAt[1] - 0.03, headAt[2] - 0.3], [0.06, 0.03, 1.15]).rotation.x = -0.25;
      mesh(sphere, new THREE.MeshBasicMaterial({ color: '#dfeaff', transparent: true, opacity: 0.14, depthWrite: false }), [0, headAt[1] - 0.06, headAt[2] - 0.3], [0.3, 0.3, 0.75]).castShadow = false;
      flickerers.push(tube);
    } else head.position.set(...headAt);
    add(head);
    if (lit) {
      mesh(sphere, new THREE.MeshBasicMaterial({ color: '#ffc267', transparent: true, opacity: 0.2, depthWrite: false }), [0, headAt[1] - 0.06, headAt[2] + 0.14], [0.4, 0.3, 0.45]).castShadow = false;
      const beam = mesh(new THREE.ConeGeometry(0.9, 4.4, 20, 1, true), new THREE.MeshBasicMaterial({ color: '#ffc267', transparent: true, opacity: 0.045, depthWrite: false, side: THREE.DoubleSide }), [0, headAt[1] - 2.3, headAt[2] + 0.14]);
      beam.castShadow = false;
    }
    const sparks = new THREE.Group();
    if (a.light === 'sparking') {
      const hot = new THREE.MeshStandardMaterial({ color: '#f1f6ff', emissive: '#bfe0ff', emissiveIntensity: 3 });
      mesh(cube, s.material('#3a3d40'), [0, armY - 0.75, 0.2], [0.26, 0.3, 0.14]);
      for (let i = 0; i < 12; i++) {
        const d = new THREE.Vector3(random() - 0.5, random() - 0.6, random() - 0.2).normalize().multiplyScalar(0.25 + random() * 0.5);
        rod([0, 0, 0], [d.x, d.y, d.z], 0.01, hot, sparks);
      }
      for (let i = 0; i < 10; i++) mesh(sphere, hot, [(random() - 0.5) * 0.9, -random() * 1.6, 0.1 + random() * 0.6], [0.022, 0.022, 0.022], sparks);
      mesh(sphere, new THREE.MeshBasicMaterial({ color: '#cfe6ff', transparent: true, opacity: 0.25, depthWrite: false }), [0, 0, 0], [0.42, 0.42, 0.42], sparks).castShadow = false;
      sparks.position.set(0.05, armY - 0.82, 0.3);
      add(sparks);
    }

    // ---- notices at eye level ----
    const number = `${'ABKMR'[Math.floor(random() * 5)]}-${100 + Math.floor(random() * 899)}`;
    const stencil = s.label(number, 0.2, 0.09, [0, 2.6, 0.135], '#22231f', '#a7a59c');
    pole.add(stencil);
    if (a.notices === 'posters') {
      const papers = ['#e9d23a', '#f1ece0', '#e8588f', '#7fc3e8', '#f1ece0', '#f08a3a'];
      const words = ['TUITION', 'TO LET', 'VOTE', 'COACHING', 'LOST', 'SALE'];
      for (let i = 0; i < 6; i++) {
        const sheet = s.label(words[Math.floor(random() * words.length)], 0.2 + random() * 0.08, 0.13 + random() * 0.1, [(random() - 0.5) * 0.05, 1.3 + i * 0.21, 0.142 - i * 0.003], '#22231f', papers[i % papers.length]);
        sheet.rotation.z = (random() - 0.5) * 0.3;
        pole.add(sheet);
        if (i % 2) { const sideSheet = mesh(cube, s.material(papers[(i + 2) % papers.length], { roughness: 0.9 }), [0.123 - i * 0.002, 1.2 + i * 0.24, 0], [0.004, 0.16, 0.16]); sideSheet.rotation.x = (random() - 0.5) * 0.3; }
      }
    } else if (a.notices === 'danger') {
      const sign = s.label('DANGER', 0.34, 0.14, [0, 1.95, 0.145], '#f6f3ea', '#b3261f');
      pole.add(sign);
      mesh(cube, s.material('#f2c21f'), [0, 2.2, 0.14], [0.3, 0.3, 0.01]).rotation.z = Math.PI / 4;
      const bolt = new THREE.Shape();
      bolt.moveTo(0.03, 0.11); bolt.lineTo(-0.05, -0.01); bolt.lineTo(0, -0.01); bolt.lineTo(-0.03, -0.11); bolt.lineTo(0.05, 0.02); bolt.lineTo(0, 0.02); bolt.closePath();
      mesh(new THREE.ShapeGeometry(bolt), s.material('#161617', { side: THREE.DoubleSide }), [0, 2.2, 0.147]);
    } else if (a.notices === 'thread') {
      for (let i = 0; i < 5; i++) { const band = mesh(new THREE.TorusGeometry(0.168, 0.008, 4, 4), s.material(i % 2 ? '#c7261f' : '#f2c21f', { roughness: 0.9 }), [0, 1.75 + i * 0.045, 0]); band.rotation.set(Math.PI / 2, 0, Math.PI / 4); }
      mesh(cube, s.material('#d9b23a', { metalness: 0.5 }), [0, 2.2, 0.14], [0.2, 0.26, 0.012]);
      mesh(cube, s.material('#e8651c'), [0, 2.2, 0.148], [0.15, 0.2, 0.004]);
      rod([0.05, 1.75, 0.15], [0.05, 1.5, 0.16], 0.003, black);
      for (let i = 0; i < 5; i++) mesh(sphere, s.material(i === 0 ? '#e6d23a' : '#3f8a3a'), [0.05, 1.48 - i * 0.045, 0.16], i === 0 ? [0.03, 0.035, 0.03] : [0.012, 0.03, 0.012]);
    }

    // ---- cables ----
    const cables: THREE.BufferGeometry[] = [];
    const spans: THREE.CatmullRomCurve3[] = [];
    const wire = (points: V3[], radius: number, closed = false) => {
      const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)), closed);
      cables.push(new THREE.TubeGeometry(curve, Math.max(10, points.length * 5), radius, 5, closed));
      return curve;
    };
    const count = Math.round(mix(5, 46, a.tangle));
    // The proper conductors off the crossarms.
    for (const [k, y] of arms.entries()) for (let i = 0; i < 4 - k; i++) {
      const x0 = (i - (3 - k) / 2) * 0.48;
      for (const side of [-1, 1]) spans.push(wire([[x0 * 0.2, y + 0.18, 0.09 + x0 * 0.9], [side * 1.6, y + 0.02, 0.09 + x0 * 1.0], [side * 3.2, y + 0.1, 0.09 + x0 * 1.05]], 0.011));
    }
    // Telecom and stolen-power lines: each sags differently and many loop back on themselves.
    for (let i = 0; i < count; i++) {
      const y = mix(4.3, 6.9, random()), side = random() < 0.5 ? -1 : 1, z = 0.16 + random() * 0.15;
      const kind = random();
      const radius = mix(0.009, 0.02, random());
      if (kind < 0.5) {
        const sag = 0.2 + random() * mix(0.3, 1.1, a.tangle), reach = 2.6 + random() * 0.8, end = y + (random() - 0.5) * 0.8;
        spans.push(wire([[0, y, z], [side * reach * 0.5, Math.min(y, end) - sag, z + (random() - 0.5) * 0.4], [side * reach, end, z + (random() - 0.5) * 0.9]], radius));
      } else if (kind < 0.8) {
        const cx = (random() - 0.5) * 0.7, r = 0.25 + random() * mix(0.2, 0.7, a.tangle);
        const loopPoints: V3[] = [];
        for (let j = 0; j < 6; j++) { const t = (j / 6) * Math.PI * 2; loopPoints.push([cx + Math.cos(t) * r * (0.7 + random() * 0.5), y - 0.4 + Math.sin(t) * r * (0.8 + random() * 0.6), z + 0.05 + (random() - 0.5) * 0.3]); }
        wire(loopPoints, radius, true);
      } else {
        const dz = (random() < 0.5 ? -1 : 1) * (1.8 + random() * 1.0);
        wire([[0, y, z * Math.sign(dz)], [side * 0.5, y - 0.7 - random() * 0.5, dz * 0.5], [side * (0.6 + random()), y - 1.4 - random(), dz]], radius);
      }
    }
    // A fat central bundle where everything is lashed to the pole.
    const fat = mix(0.06, 0.3, a.tangle);
    mesh(sphere, black, [0, 5.4, 0.2], [fat * 1.3, fat * 2.2, fat], pole).castShadow = true;
    mesh(sphere, black, [0.05, 6.3, 0.18], [fat, fat * 1.4, fat * 0.8]);
    const bundle = add(new THREE.Mesh(mergeGeometries(cables), black));
    bundle.castShadow = true;
    for (const geometry of cables) geometry.dispose();
    const along = (curve: THREE.CatmullRomCurve3, t: number) => curve.getPoint(t);

    // ---- what hangs there ----
    const swingers: THREE.Object3D[] = [];
    const pickSpan = (minimum = 4) => spans[Math.min(spans.length - 1, minimum + Math.floor(random() * Math.max(1, spans.length - minimum)))];
    if (a.hanging === 'banners') {
      const from: V3 = [0.1, 4.4, 0.2], to: V3 = [2.9, 4.0, 0.5];
      const cloth = new THREE.PlaneGeometry(2.6, 0.7, 12, 2);
      const pos = cloth.attributes.position;
      for (let i = 0; i < pos.count; i++) { const u = pos.getX(i) / 2.6 + 0.5; pos.setY(i, pos.getY(i) - Math.sin(u * Math.PI) * 0.22); pos.setZ(i, Math.sin(u * 9) * 0.05); }
      cloth.computeVertexNormals();
      const canvas = document.createElement('canvas');
      canvas.width = 512; canvas.height = 128;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = mood.cheer > 0.5 ? '#f2c21f' : '#e9e6da'; ctx.fillRect(0, 0, 512, 128);
      ctx.fillStyle = '#b3261f'; ctx.fillRect(0, 0, 512, 16); ctx.fillRect(0, 112, 512, 16);
      ctx.fillStyle = '#1f3f8f'; ctx.font = 'bold 60px monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(['GRAND MELA', 'WELCOME', 'FLOOD RELIEF', 'CRICKET CUP', 'BIG SALE'][Math.floor(random() * 5)], 256, 66, 480);
      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      const banner = mesh(cloth, new THREE.MeshStandardMaterial({ map: texture, side: THREE.DoubleSide, roughness: 0.85 }), [(from[0] + to[0]) / 2, 4.05, 0.38]);
      banner.rotation.set(0, -0.1, -0.14);
      rod(from, [0.25, 4.5, 0.25], 0.006, black);
      const flagTints = ['#e8651c', '#3fa55a', '#f2c21f', '#e8388a', '#2f9fd8', '#f1ece0'];
      const line: V3[] = [[0, 5.0, 0.18], [-1.4, 4.3, 0.5], [-2.9, 4.6, 0.9]];
      const curve = wire(line, 0.006);
      const tri = new THREE.Shape(); tri.moveTo(-0.1, 0); tri.lineTo(0.1, 0); tri.lineTo(0, -0.26); tri.closePath();
      for (let i = 1; i < 14; i++) { const p = along(curve, i / 14); const flag = mesh(new THREE.ShapeGeometry(tri), s.material(flagTints[i % flagTints.length], { side: THREE.DoubleSide, roughness: 0.8 }), [p.x, p.y, p.z]); flag.rotation.set((random() - 0.5) * 0.4, 0.3, (random() - 0.5) * 0.2); }
      const extra = add(new THREE.Mesh(new THREE.TubeGeometry(curve, 20, 0.006, 4), black));
      extra.castShadow = false;
    } else if (a.hanging === 'kites') {
      const tints = ['#e8388a', '#f2c21f', '#2f9fd8', '#3fa55a', '#e8651c'];
      for (let i = 0; i < 3 + Math.round(mood.density * 2); i++) {
        const p = along(pickSpan(), 0.2 + random() * 0.6);
        const kite = new THREE.Group();
        const diamond = new THREE.Shape(); diamond.moveTo(0, 0.3); diamond.lineTo(0.24, 0); diamond.lineTo(0, -0.34); diamond.lineTo(-0.24, 0); diamond.closePath();
        mesh(new THREE.ShapeGeometry(diamond), s.material(tints[i % tints.length], { side: THREE.DoubleSide, roughness: 0.8 }), [0, 0, 0], [1, 1, 1], kite);
        rod([0, 0.3, 0.004], [0, -0.34, 0.004], 0.004, black, kite); rod([-0.24, 0, 0.004], [0.24, 0, 0.004], 0.004, black, kite);
        const tail = new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(0, -0.34, 0), new THREE.Vector3(0.08, -0.7, 0.05), new THREE.Vector3(-0.05, -1.05, 0), new THREE.Vector3(0.06, -1.4, 0.04)]), 12, 0.008, 4);
        mesh(tail, s.material(tints[(i + 2) % tints.length]), [0, 0, 0], [1, 1, 1], kite);
        kite.position.set(p.x, p.y - 0.1, p.z + 0.03);
        kite.rotation.set((random() - 0.5) * 0.6, (random() - 0.5) * 1.2, (random() - 0.5) * 1.6);
        add(kite);
        swingers.push(kite);
      }
    } else if (a.hanging === 'washing') {
      const curve = wire([[0, 3.3, 0.16], [1.5, 2.85, 0.5], [3.0, 3.2, 0.9]], 0.006);
      add(new THREE.Mesh(new THREE.TubeGeometry(curve, 20, 0.007, 4), s.material('#d8c07a')));
      rod([3.0, 3.4, 0.9], [3.02, 2.4, 0.9], 0.006, s.material('#d8c07a'));
      const tints = ['#f1ece0', '#3f7fb5', '#e8588f', '#f2c21f', '#5a6f8c', '#c7261f'];
      for (let i = 0; i < 5; i++) {
        const p = along(curve, 0.1 + i * 0.13);
        const shirt = new THREE.Group();
        const tint = s.material(tints[Math.floor(random() * tints.length)], { side: THREE.DoubleSide, roughness: 0.95 });
        mesh(cube, tint, [0, -0.26, 0], [0.34, 0.5, 0.02], shirt);
        if (i % 2 === 0) for (const side of [-1, 1]) mesh(cube, tint, [side * 0.24, -0.1, 0], [0.2, 0.14, 0.02], shirt).rotation.z = side * 0.5;
        shirt.position.set(p.x, p.y, p.z);
        shirt.rotation.y = -0.25 + (random() - 0.5) * 0.3;
        add(shirt);
        swingers.push(shirt);
      }
      const p0 = along(curve, 0.74), p1 = along(curve, 0.95);
      const sari = mesh(new THREE.PlaneGeometry(p1.distanceTo(p0), 1.25, 8, 1), s.material(mood.cheer > 0.5 ? '#e8388a' : '#7a3f8a', { side: THREE.DoubleSide, roughness: 0.9 }), [(p0.x + p1.x) / 2, (p0.y + p1.y) / 2 - 0.62, (p0.z + p1.z) / 2]);
      sari.rotation.y = -Math.atan2(p1.z - p0.z, p1.x - p0.x);
      mesh(new THREE.PlaneGeometry(p1.distanceTo(p0), 0.12), s.material('#f2c21f', { side: THREE.DoubleSide, metalness: 0.4 }), [(p0.x + p1.x) / 2, (p0.y + p1.y) / 2 - 1.18, (p0.z + p1.z) / 2 + 0.006]).rotation.y = sari.rotation.y;
    } else if (a.hanging === 'shoes') {
      const tints = ['#f1ece0', '#c7261f', '#2a56a8', '#1d1c1b', '#3fa55a'];
      for (let i = 0; i < 4 + Math.round(mood.density * 3); i++) {
        const p = along(pickSpan(), 0.2 + random() * 0.6);
        const pair = new THREE.Group();
        const tint = s.material(tints[i % tints.length], { roughness: 0.8 });
        for (const side of [-1, 1]) {
          const drop = 0.25 + random() * 0.25;
          rod([0, 0, 0], [side * 0.05, -drop, 0], 0.004, s.material('#e9e6da'), pair);
          const shoe = mesh(sphere, tint, [side * 0.05, -drop - 0.07, 0.03], [0.05, 0.05, 0.13], pair);
          shoe.rotation.x = 1.1;
          mesh(cube, s.material('#e9e6da'), [side * 0.05, -drop - 0.13, 0.06], [0.08, 0.02, 0.2], pair).rotation.x = 1.1;
        }
        pair.position.set(p.x, p.y, p.z);
        pair.rotation.y = random() * 3;
        add(pair);
        swingers.push(pair);
      }
    } else if (a.hanging === 'loudspeakers') {
      for (const side of [-1, 1]) {
        const horn = new THREE.Group();
        mesh(new THREE.CylinderGeometry(0.3, 0.06, 0.5, 18, 1, true), s.material('#b9bfc2', { metalness: 0.5, roughness: 0.4, side: THREE.DoubleSide }), [0, 0.25, 0], [1, 1, 1], horn);
        mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.16, 10), s.material('#3a3d40'), [0, -0.05, 0], [1, 1, 1], horn);
        mesh(new THREE.TorusGeometry(0.3, 0.014, 5, 20), s.material('#3f6fb0'), [0, 0.5, 0], [1, 1, 1], horn).rotation.x = Math.PI / 2;
        horn.position.set(side * 0.3, 4.75 + (side > 0 ? 0.1 : 0), 0.12);
        horn.rotation.set(0.25, 0, -side * (Math.PI / 2 - 0.2));
        add(horn);
      }
      mesh(cube, steel, [0, 4.75, 0.1], [0.7, 0.05, 0.05]);
    } else if (a.hanging === 'nest') {
      const twig = s.material('#5a4630', { roughness: 1 });
      const nestAt: V3 = [0.2, H - 0.82, 0.15];
      mesh(sphere, twig, nestAt, [0.34, 0.14, 0.3]);
      for (let i = 0; i < 16; i++) { const t = random() * 6.28; rod([nestAt[0] + Math.cos(t) * 0.1, nestAt[1] + (random() - 0.3) * 0.1, nestAt[2] + Math.sin(t) * 0.1], [nestAt[0] + Math.cos(t + 0.8) * 0.42, nestAt[1] + (random() - 0.3) * 0.16, nestAt[2] + Math.sin(t + 0.8) * 0.4], 0.008, i % 4 ? twig : black); }
    }
    // Crows on the wires: more of them when the scene is crowded, always some with a nest.
    const crows = Math.round(mood.density * 5) + (a.hanging === 'nest' ? 3 : 0);
    for (let i = 0; i < crows; i++) {
      const curve = spans[Math.floor(random() * Math.min(spans.length, 14))];
      const p = along(curve, 0.25 + random() * 0.6);
      const crow = new THREE.Group();
      mesh(sphere, black, [0, 0.1, 0], [0.05, 0.06, 0.1], crow).rotation.x = -0.4;
      mesh(sphere, s.material('#3a3d44'), [0, 0.17, 0.07], [0.04, 0.04, 0.045], crow);
      mesh(new THREE.ConeGeometry(0.014, 0.06, 5), black, [0, 0.165, 0.125], [1, 1, 1], crow).rotation.x = Math.PI / 2;
      mesh(cube, black, [0, 0.06, -0.11], [0.05, 0.012, 0.12], crow).rotation.x = 0.4;
      crow.position.set(p.x, p.y, p.z);
      crow.rotation.y = (random() < 0.5 ? 0 : Math.PI) + (random() - 0.5) * 0.6;
      crow.scale.setScalar(1.5);
      add(crow);
    }

    // ---- lean, stay wire, water ----
    const tilt = mix(0.01, 0.34, a.lean);
    pole.rotation.z = -tilt;
    pole.rotation.x = (random() - 0.5) * 0.06 + tilt * 0.15;
    const level = 0.3;
    // The foot is set off-centre so the leaning mass still stands over the middle of its water.
    const baseX = -Math.sin(tilt) * H * 0.42;
    pole.position.x = baseX;
    const f = flood(s, 1.5 + Math.abs(baseX) * 0.85, 1.5, level);
    f.ripple(baseX, 0, 0.26, 2);
    s.box([0.55, 0.3, 0.55], [baseX, 0.15, 0], s.material('#96938a', { roughness: 1 }));
    if (a.lean > 0.3) {
      const topX = Math.sin(tilt) * (H - 1.4), topY = Math.cos(tilt) * (H - 1.4);
      s.rod([baseX + topX, topY, 0], [baseX - 1.25, level - 0.05, 0.1], 0.012, steel);
      s.cylinder(0.035, 0.035, 0.5, [baseX - 1.19, level + 0.2, 0.1], s.material('#f2c21f', { roughness: 0.6 }), 8).rotation.z = -0.19;
      f.ripple(baseX - 1.24, 0.1, 0.07, 2);
    }
    if (lit) {
      const pool = s.mesh(new THREE.CircleGeometry(1, 24), new THREE.MeshBasicMaterial({ color: '#ffc267', transparent: true, opacity: 0.22, depthWrite: false }), [baseX + Math.sin(tilt) * 6, level + 0.012, 1.3]);
      pool.rotation.x = -Math.PI / 2; pool.scale.set(0.7, 0.55, 1);
      pool.castShadow = false;
    }

    const energy = mix(0.2, 1, mood.energy);
    const rest = swingers.map((object) => object.rotation.z);
    return s.finish({
      footprint: 1.6 + Math.abs(baseX) * 0.8,
      update: (dt, time) => {
        f.update(dt, time);
        swingers.forEach((object, index) => { object.rotation.z = rest[index] + Math.sin(time * 1.6 + index * 1.3) * 0.12 * energy; });
        if (a.light === 'sparking') { const on = Math.sin(time * 17) + Math.sin(time * 7.3) > 0.2; sparks.visible = on; sparks.rotation.z = Math.floor(time * 9) * 1.7; }
        if (a.light === 'dangling') head.rotation.z = 0.5 + Math.sin(time * 1.2) * 0.25 * energy;
        for (const material of flickerers) material.emissiveIntensity = Math.sin(time * 31) > -0.7 * (1 - mood.wear * 0.6) ? 2.2 : 0.3;
      },
    });
  },
});
