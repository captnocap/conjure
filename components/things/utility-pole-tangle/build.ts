import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul, score } from '@conjure/kit';
import { drawColumn, drawGlyph } from './glyphs';

type Point = [number, number, number];

function paint(width: number, height: number, draw: (g: CanvasRenderingContext2D, w: number, h: number) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = width; canvas.height = height;
  draw(canvas.getContext('2d')!, width, height);
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  return map;
}

export default defineThing({
  questions: {
    transformers: choice('How many transformers hang on the pole?', {
      none: 'None: only wires pass through.',
      one: 'One grey drum on a bracket.',
      two: 'Two, back to back.',
      three: 'Three crowded together on a platform, humming.',
    }),
    cables: score('How tangled are the cables?', ['A few tidy lines', 'The usual bundle', 'Thick with sagging loops', 'A black bird\'s nest of wire in every direction']),
    posted: choice('What is posted on the pole at eye level?', {
      cat: 'A missing-cat flyer with a drawing and tear-off phone tabs.',
      ads: 'Layers of half-torn stickers and loan adverts.',
      election: 'A sun-bleached election poster of a smiling candidate.',
      warning: 'A yellow school-route warning sign.',
      festival: 'A red and white notice for the neighbourhood festival.',
      bare: 'Nothing but tape scars and the green address plate.',
    }),
    birds: choice('What sits on the wires?', {
      none: 'Nothing.',
      crow: 'A single large crow.',
      sparrows: 'A row of small sparrows.',
      pigeons: 'A few fat pigeons.',
    }),
    mirror: noul('Does it carry an orange convex traffic mirror?'),
    lamp: choice('What kind of street lamp is on it?', {
      none: 'None.',
      tube: 'An old fluorescent tube under a tin hood.',
      led: 'A small flat white LED head.',
      sodium: 'A bulbous amber sodium lamp.',
    }),
    foot: choice('What is at its foot?', {
      nothing: 'Bare asphalt and a yellow-and-black guard wrap.',
      cone: 'A traffic cone someone left.',
      rubbish: 'Rubbish bags under a blue crow net, waiting for collection.',
      weeds: 'Weeds and a dandelion pushing through the kerb.',
      flowers: 'A bottle of flowers and a canned coffee, left in memory of someone.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const HEIGHT = mix(8.2, 9.4, random());
    const concrete = s.material('#aaa8a0', { roughness: 0.95 });
    const steel = s.material('#7f8689', { metalness: 0.6, roughness: 0.5 });
    const drum = s.material('#9ea5a6', { metalness: 0.3, roughness: 0.55 });
    const porcelain = s.material('#ece9e0', { roughness: 0.3 });
    const cable = new THREE.MeshStandardMaterial({ color: '#1d1e21', roughness: 0.7 });
    const radiusAt = (y: number) => mix(0.17, 0.105, y / HEIGHT);

    // The pole itself, rust-streaked when worn, with step bolts up two sides.
    const skin = paint(128, 512, (g, w, h) => {
      g.fillStyle = '#aaa8a0'; g.fillRect(0, 0, w, h);
      for (let i = 0; i < 40; i++) { g.fillStyle = `rgba(${random() > 0.5 ? '255,255,255' : '60,58,52'},${0.03 + random() * 0.05})`; g.fillRect(0, random() * h, w, 2 + random() * 6); }
      for (let i = 0; i < 4 + mood.wear * 14; i++) { g.fillStyle = `rgba(120,70,35,${0.1 + random() * 0.2})`; g.fillRect(random() * w, random() * h * 0.7, 2 + random() * 5, 40 + random() * 140); }
    });
    s.mesh(new THREE.CylinderGeometry(0.105, 0.17, HEIGHT, 20), new THREE.MeshStandardMaterial({ map: skin, roughness: 0.95 }), [0, HEIGHT / 2, 0]);
    s.cylinder(0.11, 0.11, 0.03, [0, HEIGHT + 0.015, 0], steel, 12);
    const bolts: Point[] = [];
    for (let y = 1.9; y < HEIGHT - 2.2; y += 0.45) bolts.push([0, y, 0]);
    const boltMesh = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.011, 0.011, 0.2, 6), steel, bolts.length);
    bolts.forEach(([, y], index) => {
      const side = index % 2 ? 1 : -1;
      boltMesh.setMatrixAt(index, new THREE.Matrix4().compose(new THREE.Vector3(side * (radiusAt(y) + 0.08), y, 0), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, Math.PI / 2)), new THREE.Vector3(1, 1, 1)));
    });
    boltMesh.castShadow = true;
    s.root.add(boltMesh);

    // A wire sags between two ends; anything may ask where it is at a given x.
    const SPAN = 3.1;
    const wires: { y: number; z: number; sag: number }[] = [];
    const run = (y: number, z: number, sag: number, thickness: number, material: THREE.Material = cable, lift = 0) => {
      const points: Point[] = [];
      for (let i = 0; i <= 8; i++) {
        const t = i / 8, x = mix(-SPAN, SPAN, t);
        const half = Math.abs(t - 0.5) * 2; // 0 at the pole, 1 at the ends
        points.push([x, y - sag * Math.sin(half * Math.PI / 2) * 1.5 + lift * half, z + (half > 0 ? (random() - 0.5) * 0.02 : 0)]);
      }
      const path = new THREE.CatmullRomCurve3(points.map((point) => new THREE.Vector3(...point)));
      s.mesh(new THREE.TubeGeometry(path, 40, thickness, 5), material);
      wires.push({ y, z, sag });
    };
    const wireY = (wire: { y: number; sag: number }, x: number) => wire.y - wire.sag * Math.sin(Math.min(1, Math.abs(x) / SPAN) * Math.PI / 2) * 1.5;

    // High-voltage arms with insulators and three thin lines each.
    const sagBase = mix(0.12, 0.3, mood.wear);
    const arms = [HEIGHT - 0.35, HEIGHT - 1.05];
    const birdWires: { y: number; z: number; sag: number }[] = [];
    arms.forEach((y, level) => {
      s.box([0.09, 0.09, 1.9], [0, y, 0], steel);
      s.rod([0, y - 0.45, 0.12], [0, y, 0.7], 0.014, steel);
      s.rod([0, y - 0.45, -0.12], [0, y, -0.7], 0.014, steel);
      for (const z of [-0.82, level ? 0.3 : -0.25, 0.82]) {
        s.lathe([[0.02, 0], [0.05, 0.02], [0.03, 0.05], [0.055, 0.08], [0.03, 0.11], [0.05, 0.14], [0.015, 0.17]], porcelain, [0, y + 0.045, z]);
        const before = wires.length;
        run(y + 0.22, z, sagBase * mix(0.8, 1.2, random()), 0.015);
        birdWires.push(wires[before]);
      }
    });

    // Transformers on a bracket below the arms.
    const count = { none: 0, one: 1, two: 2, three: 3 }[a.transformers];
    const shelf = HEIGHT - 2.35;
    if (count) {
      s.box([count === 3 ? 1.4 : 0.14, 0.08, 1.7], [count === 3 ? 0.35 : 0, shelf, 0], steel);
      if (count === 3) for (const z of [-0.8, 0.8]) s.rod([0, shelf - 0.7, z * 0.2], [0.9, shelf, z], 0.02, steel);
      const spots: Point[] = count === 1 ? [[0, shelf, 0.52]] : count === 2 ? [[0, shelf, 0.52], [0, shelf, -0.52]] : [[0, shelf, 0.56], [0, shelf, -0.56], [0.72, shelf, 0]];
      for (const [x, y, z] of spots) {
        const r = mix(0.24, 0.3, random()), h = mix(0.7, 0.9, random());
        s.cylinder(r, r, h, [x, y + 0.04 + h / 2, z], drum, 20);
        s.cylinder(r * 1.04, r * 1.04, 0.05, [x, y + 0.04 + h, z], steel, 20);
        s.ball([r * 0.98, 0.08, r * 0.98], [x, y + 0.07 + h, z], drum, 16);
        for (let fin = 0; fin < 7; fin++) { const angle = -0.9 + fin * 0.3 + (z < 0 ? Math.PI : x > 0.3 ? Math.PI / 2 : 0); s.box([0.012, h * 0.7, 0.1], [x + Math.sin(angle) * (r + 0.04), y + 0.04 + h / 2, z + Math.cos(angle) * (r + 0.04)], steel).rotation.y = angle + Math.PI / 2; }
        for (const side of [-1, 1]) {
          s.lathe([[0.018, 0], [0.04, 0.03], [0.022, 0.06], [0.04, 0.09], [0.012, 0.14]], porcelain, [x + side * r * 0.45, y + h + 0.12, z]);
          s.tube([[x + side * r * 0.45, y + h + 0.26, z], [x + side * 0.1, y + h + 0.6, z * 0.9], [0, arms[1] + 0.2, z > 0 ? 0.82 : z < 0 ? -0.82 : 0.3]], 0.008, cable);
        }
        s.label(String(10 + Math.floor(random() * 4) * 10), 0.18, 0.1, [x + (x > 0.3 ? r + 0.004 : 0), y + 0.04 + h * 0.6, z + (x > 0.3 ? 0 : Math.sign(z) * (r + 0.004))], '#30343a', '#ece9e0').rotation.y = x > 0.3 ? Math.PI / 2 : z < 0 ? Math.PI : 0;
      }
    }

    // Low-voltage rack and telecom bundles; the mess grows with the answer and with density.
    const mess = Math.min(1, a.cables * 0.85 + mood.density * 0.15);
    const low = shelf - 0.75;
    for (let i = 0; i < 3; i++) { s.cylinder(0.035, 0.035, 0.05, [0, low - i * 0.2, radiusAt(low) + 0.07], porcelain, 10).rotation.x = Math.PI / 2; run(low - i * 0.2, radiusAt(low) + 0.07, sagBase * 1.4, 0.014); }
    const bundles = 1 + Math.round(mess * 5);
    for (let i = 0; i < bundles; i++) {
      const y = low - 0.95 - i * mix(0.28, 0.2, mess) + (random() - 0.5) * 0.1, z = (i % 2 ? -1 : 1) * (radiusAt(y) + 0.05 + random() * 0.08);
      s.ring(radiusAt(y) + 0.01, 0.012, [0, y, 0], steel).rotation.x = Math.PI / 2;
      run(y, z, sagBase * mix(1.5, 3.4, mess) * mix(0.7, 1.3, random()), mix(0.016, 0.034, random()), cable, (random() - 0.5) * mess * 1.2);
      // Splice closures and coiled slack hang off the fat ones.
      if (random() < 0.3 + mess * 0.5) {
        const side = random() > 0.5 ? 1 : -1, x = side * mix(0.5, 1.5, random()), wire = wires[wires.length - 1];
        s.cylinder(0.07, 0.07, 0.5, [x, wireY(wire, x) - 0.09, z], s.material('#26272b', { roughness: 0.5 }), 12).rotation.z = Math.PI / 2;
      }
      if (random() < mess * 0.7) {
        const side = random() > 0.5 ? 1 : -1, x = side * mix(0.4, 1.2, random()), wire = wires[wires.length - 1];
        const loop = s.ring(mix(0.16, 0.28, random()), 0.014, [x, wireY(wire, x) - 0.22, z], cable);
        loop.rotation.y = Math.PI / 2 + (random() - 0.5) * 0.5; loop.scale.y = 1.3;
      }
    }
    // Service drops leave diagonally toward houses that are not there.
    const drops = Math.round(mess * 9);
    for (let i = 0; i < drops; i++) {
      const from = low - 0.6 - random() * 1.6, side = i % 2 ? 1 : -1, reach = mix(1.8, 3, random()), lean = (random() - 0.5) * 4;
      const end: Point = [lean, from - mix(0.4, 1.8, random()), side * reach];
      const middle: Point = [lean * 0.5, (from + end[1]) / 2 - mix(0.2, 0.7, mess), side * reach * 0.5];
      s.tube([[0, from, side * radiusAt(from)], middle, end], mix(0.009, 0.016, random()), cable);
    }
    if (mess > 0.75) for (let i = 0; i < 3; i++) s.tube([[0.1, low - 1.2 - i * 0.3, 0.15], [0.3, low - 2 - random(), 0.25], [0.12, low - 2.7 - random() * 0.6, 0.18]], 0.012, cable);

    // Birds.
    const bobbers: THREE.Group[] = [];
    const bird = (size: number, bodyTone: string, at: Point) => {
      const b = new Sculpture(context);
      const feather = s.material(bodyTone, { roughness: 0.8 });
      b.ball([size * 0.5, size * 0.45, size * 0.9], [0, size * 0.5, 0], feather, 10);
      b.ball([size * 0.33, size * 0.33, size * 0.36], [0, size * 0.92, size * 0.55], feather, 10);
      b.cylinder(0.001, size * 0.1, size * 0.34, [0, size * 0.9, size * 0.98], s.material(bodyTone === '#1c1c20' ? '#2a2a2e' : '#d8a23a'), 6).rotation.x = Math.PI / 2;
      b.box([size * 0.4, size * 0.06, size * 0.8], [0, size * 0.42, -size * 1.05], feather).rotation.x = 0.3;
      b.root.position.set(...at);
      b.root.rotation.y = (random() > 0.5 ? 0 : Math.PI) + (random() - 0.5) * 0.6;
      s.root.add(b.root);
      bobbers.push(b.root);
    };
    const perch = () => birdWires[Math.floor(random() * birdWires.length)];
    if (a.birds === 'crow') { const wire = perch(), x = (random() > 0.5 ? 1 : -1) * mix(0.8, 2.4, random()); bird(0.3, '#1c1c20', [x, wireY(wire, x), wire.z]); }
    if (a.birds === 'sparrows') { const wire = perch(), start = mix(-2.6, 0.3, random()), n = 5 + Math.floor(random() * 6); for (let i = 0; i < n; i++) { const x = start + i * mix(0.2, 0.36, random()); if (Math.abs(x) > 0.25) bird(0.1, random() > 0.5 ? '#8a6a48' : '#a8845a', [x, wireY(wire, x), wire.z]); } }
    if (a.birds === 'pigeons') for (let i = 0; i < 3 + Math.floor(random() * 3); i++) { const wire = perch(), x = (random() - 0.5) * 5; if (Math.abs(x) > 0.3) bird(0.19, ['#8d939c', '#b9bcc2', '#6f7480'][Math.floor(random() * 3)], [x, wireY(wire, x), wire.z]); }

    // Street lamp, brighter the further the hour is from noon.
    const dusk = Math.abs(mood.daylight - 0.5) * 2;
    if (a.lamp !== 'none') {
      const y = 5.1;
      s.tube([[0, y - 0.5, radiusAt(y)], [0, y, 0.5], [0, y + 0.12, 1.15]], 0.025, steel);
      const hue = a.lamp === 'sodium' ? '#ffb040' : a.lamp === 'tube' ? '#e9ffe6' : '#f2f8ff';
      const glow = new THREE.MeshStandardMaterial({ color: hue, emissive: hue, emissiveIntensity: mix(0.25, 2.2, dusk) });
      if (a.lamp === 'tube') { s.box([0.2, 0.04, 0.75], [0, y + 0.1, 1.3], s.material('#d8dcd8', { metalness: 0.4 })); s.cylinder(0.025, 0.025, 0.66, [0, y + 0.055, 1.3], glow, 8).rotation.x = Math.PI / 2; }
      if (a.lamp === 'led') { s.box([0.24, 0.05, 0.42], [0, y + 0.1, 1.3], s.material('#e6e8e8', { metalness: 0.4 })); s.box([0.18, 0.012, 0.32], [0, y + 0.07, 1.3], glow); }
      if (a.lamp === 'sodium') { s.ball([0.16, 0.08, 0.3], [0, y + 0.12, 1.32], s.material('#8a8f92', { metalness: 0.5 }), 14); s.ball([0.12, 0.09, 0.22], [0, y + 0.07, 1.34], glow, 12); }
    }

    // Convex mirror on its own arm.
    if (a.mirror) {
      const y = 2.9, tilt = -0.22, turn = (random() - 0.5) * 0.8;
      const orange = s.material('#ee7a1c', { roughness: 0.5 });
      s.rod([0, y, 0], [-0.55, y + 0.1, 0.3], 0.022, orange);
      const m = new Sculpture(context);
      m.cylinder(0.4, 0.4, 0.05, [0, 0, 0], orange, 28).rotation.x = Math.PI / 2;
      m.ball([0.36, 0.36, 0.07], [0, 0, 0.02], new THREE.MeshStandardMaterial({ color: '#c9dde8', metalness: 0.6, roughness: 0.12, emissive: '#6f8fa8', emissiveIntensity: 0.35 }), 24);
      m.ball([0.1, 0.05, 0.015], [-0.1, 0.14, 0.085], new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: '#ffffff', emissiveIntensity: 0.5 }), 10);
      m.box([0.84, 0.03, 0.2], [0, 0.41, 0.08], orange);
      m.root.position.set(-0.6, y + 0.1, 0.36); m.root.rotation.set(tilt, turn, 0);
      s.root.add(m.root);
    }

    // Paper wrapped around the pole at eye level.
    const wrap = (map: THREE.Texture, y: number, height: number, arc: number, facing = 0, emissive = 0) => {
      const r = radiusAt(y) + 0.004;
      const sheet = s.mesh(new THREE.CylinderGeometry(r - 0.003, r, height, 12, 1, true, facing - arc / 2, arc), new THREE.MeshStandardMaterial({ map, roughness: 0.9, emissive: '#ffffff', emissiveMap: map, emissiveIntensity: emissive }), [0, y, 0]);
      sheet.castShadow = false;
      return sheet;
    };
    const fadeTo = (hex: string) => `#${new THREE.Color(hex).lerp(new THREE.Color('#d9d4c4'), mood.wear * 0.5).getHexString()}`;
    // The address plate is always there.
    wrap(paint(48, 160, (g, w, h) => { g.fillStyle = fadeTo('#2f7a52'); g.fillRect(0, 0, w, h); g.strokeStyle = '#f2f2ea'; g.lineWidth = 2; g.strokeRect(3, 3, w - 6, h - 6); drawColumn(g, random() > 0.5 ? '山本' : '中山', w / 2, 14, 30, '#f2f2ea', 0.12); g.fillStyle = '#f2f2ea'; g.font = 'bold 26px monospace'; g.textAlign = 'center'; g.fillText(String(1 + Math.floor(random() * 8)), w / 2, 112); g.fillText('-' + (1 + Math.floor(random() * 20)), w / 2, 142); }), 2.25, 0.5, 0.75, 0.9);
    if (a.posted === 'cat') {
      wrap(paint(160, 224, (g, w, h) => {
        g.fillStyle = fadeTo('#fbfaf2'); g.fillRect(0, 0, w, h);
        g.fillStyle = '#c8261e'; g.fillRect(8, 8, w - 16, 30); g.fillStyle = '#fff'; g.font = 'bold 22px monospace'; g.textAlign = 'center'; g.fillText('MISSING', w / 2, 31);
        g.fillStyle = random() > 0.5 ? '#e88a2c' : '#3a3836';
        g.beginPath(); g.arc(w / 2, 104, 40, 0, Math.PI * 2); g.fill();
        for (const side of [-1, 1]) { g.beginPath(); g.moveTo(w / 2 + side * 38, 92); g.lineTo(w / 2 + side * 36, 48); g.lineTo(w / 2 + side * 10, 70); g.fill(); }
        g.fillStyle = '#f2e23a'; for (const side of [-1, 1]) { g.beginPath(); g.ellipse(w / 2 + side * 16, 100, 8, 6, 0, 0, Math.PI * 2); g.fill(); }
        g.fillStyle = '#111'; for (const side of [-1, 1]) g.fillRect(w / 2 + side * 16 - 1.5, 94, 3, 12);
        g.fillStyle = '#f2a0a8'; g.beginPath(); g.moveTo(w / 2 - 5, 114); g.lineTo(w / 2 + 5, 114); g.lineTo(w / 2, 121); g.fill();
        g.fillStyle = '#333'; for (let i = 0; i < 3; i++) g.fillRect(16, 156 + i * 9, w - 32 - random() * 40, 3);
        const torn = Math.floor(random() * 4 + mood.wear * 3);
        for (let i = 0; i < 8; i++) { g.fillStyle = '#bbb'; g.fillRect(i * 20, 186, 1.5, 38); if (i < torn || random() < 0.2) { g.fillStyle = '#aaa8a0'; g.fillRect(i * 20 + 2, 188 + random() * 8, 17, 40); } else { g.fillStyle = '#333'; g.fillRect(i * 20 + 9, 192, 2.5, 26); } }
      }), 1.55, 0.6, 1.6, 0);
    } else if (a.posted === 'ads') {
      wrap(paint(256, 256, (g, w, h) => {
        g.fillStyle = '#aaa8a0'; g.fillRect(0, 0, w, h);
        for (let i = 0; i < 16 + mood.density * 14; i++) {
          g.save(); g.translate(random() * w, random() * h); g.rotate((random() - 0.5) * 0.5);
          const sw = 30 + random() * 60, sh = 20 + random() * 70;
          g.fillStyle = fadeTo(['#f2e23a', '#e8483c', '#fbfaf2', '#2f6fd0', '#ff8fb8', '#2fae62', '#1d1d22'][Math.floor(random() * 7)]); g.fillRect(-sw / 2, -sh / 2, sw, sh);
          g.fillStyle = random() > 0.5 ? '#111' : '#fff'; for (let k = 0; k < 3; k++) g.fillRect(-sw / 2 + 4, -sh / 2 + 5 + k * 9, sw * (0.4 + random() * 0.5), 4);
          if (random() < mood.wear) { g.fillStyle = '#aaa8a0'; g.beginPath(); g.moveTo(sw / 2, -sh / 2); g.lineTo(sw / 2 - sw * random(), -sh / 2); g.lineTo(sw / 2, sh * (random() - 0.3)); g.fill(); }
          g.restore();
        }
      }), 1.6, 1.1, Math.PI * 1.6, 0);
    } else if (a.posted === 'election') {
      wrap(paint(160, 224, (g, w, h) => {
        g.fillStyle = fadeTo('#2a66c8'); g.fillRect(0, 0, w, h);
        g.fillStyle = fadeTo('#f0c8a0'); g.beginPath(); g.ellipse(w / 2, 84, 32, 40, 0, 0, Math.PI * 2); g.fill();
        g.fillStyle = fadeTo('#26262a'); g.beginPath(); g.ellipse(w / 2, 56, 34, 22, 0, Math.PI, Math.PI * 2); g.fill();
        g.beginPath(); g.moveTo(20, h - 44); g.quadraticCurveTo(w / 2, 104, w - 20, h - 44); g.lineTo(w - 20, h - 44); g.fill(); g.fillRect(20, h - 46, w - 40, 10);
        g.fillStyle = '#fff'; g.beginPath(); g.moveTo(w / 2 - 12, 124); g.lineTo(w / 2 + 12, 124); g.lineTo(w / 2, 150); g.fill();
        g.strokeStyle = '#7a3a2a'; g.lineWidth = 3; g.beginPath(); g.arc(w / 2, 92, 14, 0.2, Math.PI - 0.2); g.stroke();
        g.fillStyle = fadeTo('#e8483c'); g.fillRect(0, h - 40, w, 40); drawGlyph(g, '山', 30, h - 38, 34, '#fff', 0.14); drawGlyph(g, '本', 70, h - 38, 34, '#fff', 0.14); drawGlyph(g, '大', 110, h - 38, 34, '#fff', 0.14);
      }), 1.7, 0.72, 1.7, 0);
    } else if (a.posted === 'warning') {
      wrap(paint(128, 256, (g, w, h) => {
        g.fillStyle = fadeTo('#f2d21e'); g.fillRect(0, 0, w, h);
        g.fillStyle = fadeTo('#2f8a4a'); g.fillRect(0, 0, w, 18); g.fillRect(0, h - 18, w, 18);
        g.fillStyle = '#1d1d22';
        for (const [cx, size] of [[44, 1], [86, 0.75]] as const) { g.beginPath(); g.arc(cx, 70 + (1 - size) * 30, 13 * size, 0, Math.PI * 2); g.fill(); g.fillRect(cx - 11 * size, 86 + (1 - size) * 26, 22 * size, 44 * size); g.fillRect(cx - 11 * size, 128, 8 * size, 34 * size); g.fillRect(cx + 3 * size, 128, 8 * size, 34 * size); }
        g.fillStyle = '#c8261e'; g.font = 'bold 56px monospace'; g.textAlign = 'center'; g.fillText('!', w / 2, 222);
      }), 1.75, 0.85, 1.5, 0.15);
    } else if (a.posted === 'festival') {
      wrap(paint(160, 240, (g, w, h) => {
        g.fillStyle = fadeTo('#fbf6e6'); g.fillRect(0, 0, w, h);
        g.fillStyle = fadeTo('#c8261e'); for (let i = 0; i < 5; i++) g.fillRect(i * 36, 0, 18, 22); g.fillRect(0, h - 14, w, 14);
        drawGlyph(g, '大', 36, 34, 88, fadeTo('#c8261e'), 0.15);
        g.beginPath(); g.ellipse(w / 2, 168, 26, 32, 0, 0, Math.PI * 2); g.fill(); g.fillStyle = '#1d1d22'; g.fillRect(w / 2 - 16, 132, 32, 7); g.fillRect(w / 2 - 16, 197, 32, 7);
        drawGlyph(g, '天', w / 2 - 15, 153, 30, '#fbf6e6', 0.14);
      }), 1.65, 0.8, 1.7, 0);
    } else {
      wrap(paint(128, 128, (g, w, h) => { g.fillStyle = '#aaa8a0'; g.fillRect(0, 0, w, h); for (let i = 0; i < 12; i++) { g.save(); g.translate(random() * w, random() * h); g.rotate(random() * 3); g.fillStyle = `rgba(225,215,180,${0.3 + random() * 0.4})`; g.fillRect(-14, -3, 28, 6); g.restore(); } for (let i = 0; i < 4; i++) { g.fillStyle = 'rgba(240,238,228,0.6)'; g.fillRect(random() * w, random() * h, 8 + random() * 16, 5 + random() * 12); } }), 1.6, 0.7, Math.PI * 1.5, 0);
    }

    // Yellow and black guard wrap, then whatever is at the foot.
    wrap(paint(128, 128, (g, w, h) => { g.fillStyle = fadeTo('#f2c81e'); g.fillRect(0, 0, w, h); g.fillStyle = '#1d1d22'; for (let i = -4; i < 8; i++) { g.beginPath(); g.moveTo(i * 32, h); g.lineTo(i * 32 + 16, h); g.lineTo(i * 32 + 16 + h, 0); g.lineTo(i * 32 + h, 0); g.fill(); } }), 0.62, 1.0, Math.PI * 2, 0);
    if (a.foot === 'cone') {
      const cx = 0.5 + random() * 0.3, cz = 0.35 + random() * 0.3, lean = random() > 0.7;
      const c = new Sculpture(context);
      c.box([0.36, 0.03, 0.36], [0, 0.015, 0], s.material('#1d1d22'));
      c.cylinder(0.025, 0.14, 0.62, [0, 0.34, 0], s.material('#e8541e', { roughness: 0.5 }), 16);
      c.cylinder(0.071, 0.095, 0.11, [0, 0.36, 0], s.material('#f4f4f0'), 16);
      c.root.position.set(cx, lean ? 0.16 : 0, cz); if (lean) c.root.rotation.set(0, random() * 3, Math.PI / 2 - 0.22);
      s.root.add(c.root);
    } else if (a.foot === 'rubbish') {
      const bags = 4 + Math.floor(random() * 3 + mood.density * 4);
      for (let i = 0; i < bags; i++) {
        const r = mix(0.2, 0.3, random()), bx = 0.45 + random() * 0.8, bz = (random() - 0.3) * 0.9;
        s.ball([r, r * 0.8, r], [bx, r * 0.72 + (i > 3 ? 0.25 : 0), bz], s.material(random() > 0.25 ? '#e9ecec' : '#cfe0ea', { roughness: 0.35 }), 12);
        s.cylinder(0.02, 0.05, 0.1, [bx, r * 1.5 + (i > 3 ? 0.25 : 0), bz], s.material('#dfe3e3'), 6);
      }
      const net = paint(128, 128, (g, w, h) => { g.clearRect(0, 0, w, h); g.strokeStyle = '#2a6fd0'; g.lineWidth = 3; for (let i = 0; i <= 12; i++) { g.beginPath(); g.moveTo(i * w / 12, 0); g.lineTo(i * w / 12, h); g.moveTo(0, i * h / 12); g.lineTo(w, i * h / 12); g.stroke(); } });
      const cover = s.mesh(new THREE.SphereGeometry(1, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ map: net, alphaTest: 0.4, side: THREE.DoubleSide, roughness: 0.8 }), [0.85, 0, 0.15]);
      cover.scale.set(0.85, 0.72, 0.8); cover.castShadow = false;
    } else if (a.foot === 'weeds') {
      for (let i = 0; i < 18 + mood.wear * 16; i++) { const angle = random() * Math.PI * 2, reach = 0.2 + random() * 0.35, h = mix(0.1, 0.42, random()); const blade = s.cylinder(0.002, 0.014, h, [Math.sin(angle) * reach, h / 2, Math.cos(angle) * reach], s.material(['#5c8a3c', '#7a9a48', '#49703a'][Math.floor(random() * 3)]), 5); blade.rotation.set((random() - 0.5) * 0.7, 0, (random() - 0.5) * 0.7); }
      for (let i = 0; i < 2 + Math.floor(random() * 3); i++) { const angle = random() * Math.PI * 2, reach = 0.3 + random() * 0.2, h = 0.14 + random() * 0.1; s.rod([Math.sin(angle) * reach, 0, Math.cos(angle) * reach], [Math.sin(angle) * reach, h, Math.cos(angle) * reach], 0.004, s.material('#7a9a48')); s.ball([0.03, 0.015, 0.03], [Math.sin(angle) * reach, h, Math.cos(angle) * reach], s.material('#f2d21e', { emissive: '#8a7a08', emissiveIntensity: 0.3 }), 8); }
    } else if (a.foot === 'flowers') {
      const fx = 0.06, fz = 0.3;
      s.cylinder(0.035, 0.04, 0.2, [fx, 0.1, fz], new THREE.MeshStandardMaterial({ color: '#cfe6e0', transparent: true, opacity: 0.45, depthWrite: false }), 12);
      s.cylinder(0.034, 0.039, 0.09, [fx, 0.05, fz], s.material('#9fc8c8', { roughness: 0.1 }), 12);
      for (let i = 0; i < 5; i++) { const lean = (random() - 0.5) * 0.14, lz = (random() - 0.5) * 0.1, top = 0.36 + random() * 0.14; s.rod([fx, 0.04, fz], [fx + lean, top, fz + lz], 0.004, s.material('#4d7a3c')); s.ball([0.035, 0.03, 0.035], [fx + lean, top, fz + lz], s.material(['#f4f1e6', '#f2c62e', '#e889a8', '#f4f1e6'][i % 4], { roughness: 0.7 }), 8); }
      s.cylinder(0.026, 0.026, 0.105, [fx + 0.14, 0.0525, fz + 0.02], s.material('#6a4020', { metalness: 0.5, roughness: 0.35 }), 12);
      s.cylinder(0.024, 0.024, 0.004, [fx + 0.14, 0.107, fz + 0.02], s.material('#d0d4d6', { metalness: 0.8 }), 12);
      s.cylinder(0.03, 0.02, 0.012, [fx - 0.13, 0.006, fz + 0.04], s.material('#f4f1e6'), 10);
    }

    // A guy wire with its yellow guard on some poles.
    if (random() > 0.45) {
      const side = random() > 0.5 ? 1 : -1;
      s.rod([0, HEIGHT - 2.9, 0], [side * 0.3, 0, -2.2], 0.012, steel);
      s.rod([side * 0.19, 1.9, -1.4], [side * 0.3, 0, -2.2], 0.035, s.material('#f2c81e', { roughness: 0.5 }));
    }

    const speed = mix(0.4, 3, mood.energy);
    return s.finish({
      footprint: 1.3,
      update: (_dt, time) => bobbers.forEach((group, index) => { group.rotation.x = Math.max(0, Math.sin(time * speed + index * 2.1) - 0.75) * 1.4; }),
    });
  },
});
