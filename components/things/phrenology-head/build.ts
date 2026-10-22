import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix } from '@conjure/kit';
import { DEG, dir, fuse, globe, inkText, painted, placed, scribble, skin, smooth, spot, stain, strut } from './form';
import { EYE, HEAD_UNIT, earParts, headShape, paintFace } from './head';

const FACULTIES = ['Hope', 'Wit', 'Tune', 'Time', 'Order', 'Colour', 'Weight', 'Size', 'Form', 'Language', 'Benevolence', 'Veneration', 'Firmness', 'Self Esteem', 'Conscience', 'Ideality', 'Sublimity', 'Wonder', 'Imitation', 'Mirth', 'Causality', 'Comparison', 'Eventuality', 'Locality', 'Secrecy', 'Acquisition', 'Destruction', 'Combat', 'Friendship', 'Home', 'Parental Love', 'Continuity', 'Vitality', 'Calculation', 'Caution', 'Approbation', 'Amativeness', 'Agreeable', 'Human Nature', 'Spirituality', 'Constructive', 'Alimentive', 'Inhabitive', 'Marvel', 'Memory', 'Reason'];
const SEEDS: readonly (readonly [number, number])[] = [
  [0, 24], [0, 46], [0, 68], [0, 89], [180, 66], [180, 42], [180, 17], [180, -10],
  [19, 26], [39, 22], [57, 16], [24, 48], [50, 42], [73, 31], [88, 12], [36, 70], [72, 58], [96, 40], [112, 16], [106, -10], [126, 50], [136, 24], [142, -4], [154, 62], [160, 36], [162, 9], [130, -24], [160, -18],
];
/** The mapped part of the head: scalp, temples and the back of the neck, not the face. */
const mapped = (lon: number, lat: number) => lat > 13 - 43 * smooth(52, 104, Math.abs(lon));

export default defineThing({
  questions: {
    map: choice('What is drawn on the head?', {
      classic: 'The classic chart: the scalp divided into bordered regions, each named in small script.',
      symbols: 'The same regions, but each holds a little symbol: a star, a moon, an eye, a heart, like a palmist\'s chart.',
      pencil: 'Someone has pencilled their own crooked divisions, numbers and question marks onto a plain head.',
      blank: 'Nothing: a bare glazed head waiting to be mapped.',
    }),
    glaze: choice('What is the glaze like?', {
      crazed: 'White, covered in a fine web of age crazing.',
      cream: 'Smooth warm cream.',
      black: 'Glossy black, with the lines in pale slip.',
      gilded: 'White with the dividing lines picked out in gold.',
    }),
    ink: choice('What colour is the lettering?', {
      cobalt: 'Cobalt blue, the familiar pharmacy blue-and-white.',
      black: 'Plain black.',
      sepia: 'Faded brown sepia.',
      oxblood: 'Dark red.',
    }),
    damage: choice('What has happened to it?', {
      perfect: 'Nothing; it is perfect.',
      chipped: 'The tip of the nose has been knocked off, showing raw biscuit clay.',
      riveted: 'It was broken across the skull and mended long ago with a row of metal staples.',
      dressed: 'Someone has put their own hat or spectacles on it.',
    }),
    gaze: choice('What are its eyes like?', {
      blank: 'Blank, unpainted, like a statue.',
      painted: 'Painted open, pale blue and staring.',
      closed: 'Painted closed, lashes down, as if it were being read in its sleep.',
    }),
    base: choice('What is written on the base?', {
      maker: 'The maker\'s name and town.',
      motto: 'A motto: KNOW THYSELF.',
      none: 'Nothing.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const jitter = (amount: number) => (random() - 0.5) * 2 * amount;
    const black = a.glaze === 'black';
    const body = { crazed: '#f3f1ea', cream: '#efe4c6', black: '#1d1c21', gilded: '#f6f4ee' }[a.glaze];
    const inkBase = { cobalt: '#1f47a8', black: '#17161b', sepia: '#6b4a2a', oxblood: '#7c1f24' }[a.ink];
    const ink = black ? `#${new THREE.Color(inkBase).lerp(new THREE.Color('#f4efdf'), 0.82).getHexString()}` : inkBase;
    const lineColour = a.glaze === 'gilded' ? '#c79a2e' : ink;
    const pencil = a.map === 'pencil';
    const shape = headShape({ chipped: a.damage === 'chipped' });

    const seeds = SEEDS.flatMap(([lon, lat]) => (lon === 0 || lon === 180 ? [[lon, lat]] : [[lon, lat], [-lon, lat]]))
      .map(([lon, lat]) => [lon + jitter(pencil ? 9 : 2.5), lat + jitter(pencil ? 8 : 2.5)] as [number, number]);
    const seedDirs = seeds.map(([lon, lat]) => dir(lon, lat));
    const crack: [number, number][] = [[-95 + jitter(10), 20], [-62, 52 + jitter(6)], [-20, 44 + jitter(6)], [12, 18], [30 + jitter(5), -8], [44, -40]];

    const map = skin(2048, 1024, (ctx) => {
      ctx.fillStyle = body;
      ctx.fillRect(-180, -90, 360, 180);
      for (let i = 0; i < 40; i++) stain(ctx, jitter(180), jitter(88), 8 + random() * 26, black ? '#3a3840' : '#7d6a4c', (0.04 + random() * 0.2) * mood.wear);
      if (a.glaze === 'crazed') {
        for (let i = 0; i < 260; i++) {
          const lon = jitter(180), lat = jitter(88);
          scribble(ctx, [[lon, lat], [lon + jitter(9), lat + jitter(7)], [lon + jitter(14), lat + jitter(11)]], 0.22, '#8f8a7c', 1.2, random);
        }
      }
      if (a.map !== 'blank') {
        // Regions: each point of the scalp belongs to the nearest seed; borders fall where neighbours differ.
        const W = 360, H = 150;
        const ids = new Int16Array(W * H);
        const d = new THREE.Vector3();
        for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
          const lon = -180 + (x + 0.5), lat = 90 - (y + 0.5) * 0.9;
          if (!mapped(lon, lat)) { ids[y * W + x] = -1; continue; }
          dir(lon, lat, d);
          let best = -2, bestIndex = 0;
          for (let k = 0; k < seedDirs.length; k++) { const dot = d.dot(seedDirs[k]); if (dot > best) { best = dot; bestIndex = k; } }
          ids[y * W + x] = bestIndex;
        }
        ctx.fillStyle = pencil ? (black ? '#b9b6ae' : '#5c5a58') : lineColour;
        const thick = pencil ? 0.55 : 0.95;
        for (let y = 0; y < H - 1; y++) for (let x = 0; x < W; x++) {
          const here = ids[y * W + x], right = ids[y * W + ((x + 1) % W)], below = ids[(y + 1) * W + x];
          if (here === right && here === below) continue;
          const lon = -180 + x + 0.5, lat = 90 - (y + 0.5) * 0.9;
          const stretch = 1 / Math.max(0.3, Math.cos(lat * DEG));
          ctx.fillRect(lon + 0.5 - thick * stretch / 2 + (pencil ? jitter(0.5) : 0), lat - 0.45 - thick / 2 + (pencil ? jitter(0.4) : 0), (here !== right ? thick * stretch : 1.05), (here !== below ? thick : 0.95));
        }
        const names = FACULTIES.map((name) => ({ name, order: random() })).sort((x, y) => x.order - y.order).map(({ name }) => name);
        seeds.forEach(([lon, lat], index) => {
          if (!mapped(lon, lat) || lat > 84) return;
          if (a.map === 'classic') {
            const words = names[index % names.length].split(' ');
            words.forEach((word, row) => inkText(ctx, word, lon, lat + (words.length - 1) * 1.9 - row * 3.8, word.length > 9 ? 3.3 : 4, ink, jitter(0.06), 'italic bold serif'));
          } else if (a.map === 'symbols') {
            glyph(ctx, index + Math.floor(random() * 3), lon, lat, 4.6, ink);
          } else {
            const mark = random() < 0.2 ? '?' : String(1 + index);
            inkText(ctx, mark, lon + jitter(2), lat + jitter(2), 5.5, black ? '#c9c6bd' : '#55534f', jitter(0.3), 'italic sans-serif');
            if (random() < 0.18) { ctx.strokeStyle = black ? '#c9c6bd' : '#55534f'; ctx.lineWidth = 0.4; ctx.beginPath(); ctx.ellipse(lon, lat, 6.5 / Math.cos(lat * DEG), 5, 0, 0, Math.PI * 2); ctx.stroke(); }
          }
        });
      }
      paintFace(ctx, {
        eyes: a.gaze === 'painted' ? 'open' : a.gaze === 'closed' ? 'closed' : 'blank',
        iris: black ? '#9db7d9' : '#5d8fc7', line: black ? '#d8d3c4' : ink, white: black ? '#e9e5d8' : '#ffffff',
        brows: a.gaze === 'blank' ? null : black ? '#d8d3c4' : ink, lips: null,
      });
      if (a.damage === 'chipped') {
        spot(ctx, 0, -27.5, 5.2, '#b59a78', 0.85);
        spot(ctx, 1, -28, 3.2, '#9b8162', 0.8);
        if (random() < 0.6) spot(ctx, 60 + jitter(20), 30 + jitter(20), 2.4, '#b59a78');
      }
      if (a.damage === 'riveted') scribble(ctx, crack, 1.1, black ? '#6d6a72' : '#3b3128', 1.6, random);
    });

    const gloss = mix(0.14, 0.5, mood.wear);
    const glaze = new THREE.MeshStandardMaterial({ map, roughness: gloss });
    const plain = new THREE.MeshStandardMaterial({ color: body, roughness: gloss });
    const G = new THREE.Group();
    G.scale.setScalar(HEAD_UNIT * 0.95);
    s.root.add(G);
    const add = (geometry: THREE.BufferGeometry, material: THREE.Material, parent: THREE.Object3D = G) => {
      const mesh = new THREE.Mesh(geometry, material);
      mesh.castShadow = mesh.receiveShadow = true;
      parent.add(mesh);
      return mesh;
    };
    add(globe(shape, 160, 100), glaze);
    const neck = new THREE.LatheGeometry([[0, -2.15], [0.84, -2.15], [0.88, -2.1], [0.88, -1.72], [0.84, -1.66], [0.7, -1.58], [0.52, -1.42], [0.46, -1.1], [0.42, -0.7]].map(([x, y]) => new THREE.Vector2(x, y)), 48);
    neck.translate(0, 0, -0.1);
    add(fuse([neck, ...earParts()], plain).geometry, plain);
    // Bands of colour round the foot, and the lettering between them.
    const trim = new THREE.MeshStandardMaterial({ color: lineColour, roughness: gloss, metalness: a.glaze === 'gilded' ? 0.6 : 0 });
    for (const y of [-1.745, -2.07]) add(placed(new THREE.CylinderGeometry(0.888, 0.888, 0.035, 48, 1, true), [0, y, -0.1]), trim);
    if (a.base !== 'none') {
      const lines = a.base === 'motto' ? ['KNOW THYSELF'] : ['PHRENOLOGY', `${['A. HOLLIS', 'J. MARLOW & SON', 'E. PENHALE', 'WREN BROS'][Math.floor(random() * 4)]} · ${['BATH', 'LEEDS', 'BOSTON', 'YORK'][Math.floor(random() * 4)]}`];
      const band = painted(1024, 160, (ctx, w, h) => {
        ctx.fillStyle = body; ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = ink; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        if (lines.length === 1) { ctx.font = 'bold 84px serif'; ctx.fillText(lines[0], w / 2, h / 2 + 4, w - 60); }
        else { ctx.font = 'bold 74px serif'; ctx.fillText(lines[0], w / 2, 52, w - 80); ctx.font = '44px serif'; ctx.fillText(lines[1], w / 2, 122, w - 80); }
      });
      add(placed(new THREE.CylinderGeometry(0.886, 0.886, 0.28, 40, 1, true, -1.15, 2.3), [0, -1.908, -0.1]), new THREE.MeshStandardMaterial({ map: band, roughness: gloss }));
    }

    if (a.damage === 'riveted') {
      const steel = new THREE.MeshStandardMaterial({ color: '#8e8f8c', metalness: 0.75, roughness: 0.45 });
      const staples: THREE.BufferGeometry[] = [];
      for (let i = 0; i < crack.length - 1; i++) for (const f of [0.3, 0.75]) {
        const lon = crack[i][0] + (crack[i + 1][0] - crack[i][0]) * f, lat = crack[i][1] + (crack[i + 1][1] - crack[i][1]) * f;
        const tx = crack[i + 1][0] - crack[i][0], ty = crack[i + 1][1] - crack[i][1], length = Math.hypot(tx, ty);
        const ox = -ty / length * 5.5, oy = tx / length * 5.5;
        const p = shape(dir(lon + ox, lat + oy), lon + ox, lat + oy).clone().multiplyScalar(1.012);
        const q = shape(dir(lon - ox, lat - oy), lon - ox, lat - oy).clone().multiplyScalar(1.012);
        staples.push(strut([p.x, p.y, p.z], [q.x, q.y, q.z], 0.014, 0.014, 5));
        staples.push(placed(new THREE.SphereGeometry(0.024, 6, 5), [p.x, p.y, p.z]), placed(new THREE.SphereGeometry(0.024, 6, 5), [q.x, q.y, q.z]));
      }
      add(fuse(staples, steel).geometry, steel);
    }

    if (a.damage === 'dressed') {
      const pick = random();
      const glasses = pick < 0.66, hat = pick > 0.33;
      if (glasses) {
        const wire = new THREE.MeshStandardMaterial({ color: mood.warmth > 0.5 ? '#c9a24a' : '#2a2a2e', metalness: 0.85, roughness: 0.3 });
        const parts: THREE.BufferGeometry[] = [];
        const lens: THREE.Vector3[] = [];
        for (const side of [-1, 1]) {
          const p = shape(dir(side * EYE.lon, EYE.lat), side * EYE.lon, EYE.lat).clone();
          p.z += 0.11; p.y -= 0.03;
          lens.push(p);
          const rim = new THREE.TorusGeometry(0.175, 0.016, 6, 28);
          rim.rotateY(side * 0.16);
          parts.push(placed(rim, [p.x, p.y, p.z]));
          parts.push(strut([p.x + side * 0.17, p.y + 0.03, p.z - 0.02], [side * 0.84, -0.1, -0.02], 0.013, 0.013, 5));
          parts.push(strut([side * 0.84, -0.1, -0.02], [side * 0.82, -0.3, -0.2], 0.013, 0.013, 5));
        }
        parts.push(strut([lens[0].x + 0.17, lens[0].y + 0.05, lens[0].z + 0.03], [lens[1].x - 0.17, lens[1].y + 0.05, lens[1].z + 0.03], 0.014, 0.014, 5));
        const frames = add(fuse(parts, wire).geometry, wire);
        frames.rotation.z = jitter(0.05);
      }
      if (hat) {
        const H = new THREE.Group();
        const party = mood.cheer > 0.66;
        if (party) {
          const colours = ['#e8336a', '#f2a900', '#1fa6a0', '#7b3fc4'];
          const cone = painted(256, 256, (ctx, w, h) => {
            for (let i = 0; i < 12; i++) { ctx.fillStyle = colours[i % colours.length]; ctx.fillRect(i * w / 12, 0, w / 12 + 1, h); }
          });
          add(placed(new THREE.ConeGeometry(0.42, 0.95, 28, 1, true), [0, 0.47, 0]), new THREE.MeshStandardMaterial({ map: cone, roughness: 0.6, side: THREE.DoubleSide }), H);
          add(placed(new THREE.SphereGeometry(0.09, 10, 8), [0, 0.97, 0]), new THREE.MeshStandardMaterial({ color: colours[Math.floor(random() * 4)], roughness: 0.9 }), H);
          H.position.set(jitter(0.2), 0.78, 0.1);
        } else {
          const felt = new THREE.MeshStandardMaterial({ color: ['#1c1b1d', '#3a2c22', '#4a4f45', '#6b2a2a'][Math.floor(random() * 4)], roughness: 0.92 });
          const bowler = random() < 0.5;
          if (bowler) {
            add(placed(new THREE.SphereGeometry(1, 28, 14, 0, Math.PI * 2, 0, Math.PI / 2), [0, 0, 0], [0.83, 0.62, 1.02]), felt, H);
            const brim = new THREE.TorusGeometry(1, 0.1, 8, 40);
            brim.rotateX(Math.PI / 2);
            add(placed(brim, [0, 0.02, 0], [1.0, 0.45, 1.2]), felt, H);
            add(placed(new THREE.CylinderGeometry(0.84, 0.84, 0.11, 32, 1, true), [0, 0.08, 0], [1, 1, 1.23]), new THREE.MeshStandardMaterial({ color: '#0d0d0e', roughness: 0.5 }), H);
          } else {
            add(placed(new THREE.SphereGeometry(1, 28, 12, 0, Math.PI * 2, 0, Math.PI / 2), [0, 0, -0.05], [0.9, 0.3, 1.1]), felt, H);
            add(placed(new THREE.SphereGeometry(1, 20, 8), [0, 0.0, 0.92], [0.62, 0.035, 0.42], [0.22, 0, 0]), felt, H);
            add(placed(new THREE.SphereGeometry(0.06, 8, 6), [0, 0.3, -0.05]), felt, H);
          }
          H.position.set(0, 0.5, 0.02);
          H.rotation.set(-0.12 + jitter(0.06), jitter(0.3), jitter(0.16));
        }
        G.add(H);
      }
    }
    G.rotation.y = jitter(0.1);
    return s.finish();
  },
});

/** Small chart symbols drawn in a skin's degree units. */
function glyph(ctx: CanvasRenderingContext2D, which: number, lon: number, lat: number, size: number, colour: string) {
  ctx.save();
  ctx.translate(lon, lat);
  ctx.scale(size / Math.max(0.35, Math.cos(lat * DEG)), size);
  ctx.strokeStyle = ctx.fillStyle = colour;
  ctx.lineWidth = 0.16;
  ctx.beginPath();
  switch (which % 8) {
    case 0: for (let i = 0; i < 10; i++) { const r = i % 2 ? 0.42 : 1, t = i / 10 * Math.PI * 2 + Math.PI / 2; ctx.lineTo(Math.cos(t) * r, Math.sin(t) * r); } ctx.fill(); break;
    case 1: ctx.arc(0, 0, 0.9, 0.5, Math.PI * 2 - 0.5); ctx.arc(0.45, 0, 0.72, Math.PI * 2 - 0.9, 0.9, true); ctx.fill(); break;
    case 2: ctx.arc(0, 0, 0.45, 0, Math.PI * 2); ctx.fill(); for (let i = 0; i < 8; i++) { const t = i / 8 * Math.PI * 2; ctx.moveTo(Math.cos(t) * 0.65, Math.sin(t) * 0.65); ctx.lineTo(Math.cos(t) * 1.05, Math.sin(t) * 1.05); } ctx.stroke(); break;
    case 3: ctx.ellipse(0, 0, 1.05, 0.55, 0, 0, Math.PI * 2); ctx.stroke(); ctx.beginPath(); ctx.arc(0, 0, 0.32, 0, Math.PI * 2); ctx.fill(); break;
    case 4: ctx.moveTo(0, -0.9); ctx.bezierCurveTo(-1.5, 0.1, -0.6, 1.1, 0, 0.4); ctx.bezierCurveTo(0.6, 1.1, 1.5, 0.1, 0, -0.9); ctx.fill(); break;
    case 5: ctx.moveTo(0, 0.95); ctx.lineTo(0.9, -0.7); ctx.lineTo(-0.9, -0.7); ctx.closePath(); ctx.stroke(); break;
    case 6: ctx.moveTo(0, -1); ctx.lineTo(0, 1); ctx.moveTo(-0.7, 0.3); ctx.lineTo(0.7, 0.3); ctx.stroke(); break;
    default: for (let i = 0; i < 40; i++) { const t = i / 40 * Math.PI * 5, r = i / 40; ctx.lineTo(Math.cos(t) * r, Math.sin(t) * r); } ctx.stroke();
  }
  ctx.restore();
}
// v2
