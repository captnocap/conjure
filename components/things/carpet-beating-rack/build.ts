import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';

type P3 = [number, number, number];

const PATTERNS = {
  bukhara: 'Deep red with rows of dark octagonal guls and a black border, the carpet every flat had.',
  medallion: 'Burgundy with one big cream diamond medallion in the middle and a wide ornate border.',
  deer: 'A wall tapestry of a stag in a forest clearing, browns and bottle greens.',
  runner: 'A long hallway runner in green with red and yellow stripes down its length.',
  roses: 'Dark green scattered with fat pink and red cabbage roses.',
  seventies: 'Orange and brown interlocking diamonds from a 1970s furniture shop.',
} as const;

function rugTexture(kind: keyof typeof PATTERNS, random: () => number, fade: number) {
  const canvas = document.createElement('canvas');
  canvas.width = 256; canvas.height = 512;
  const g = canvas.getContext('2d')!;
  const W = 256, H = 512;
  const rect = (c: string, x: number, y: number, w: number, h: number) => { g.fillStyle = c; g.fillRect(x, y, w, h); };
  const diamond = (c: string, cx: number, cy: number, rx: number, ry: number) => {
    g.fillStyle = c; g.beginPath(); g.moveTo(cx, cy - ry); g.lineTo(cx + rx, cy); g.lineTo(cx, cy + ry); g.lineTo(cx - rx, cy); g.closePath(); g.fill();
  };
  const octagon = (c: string, cx: number, cy: number, r: number) => {
    g.fillStyle = c; g.beginPath();
    for (let i = 0; i < 8; i++) g.lineTo(cx + Math.cos(i * Math.PI / 4 + Math.PI / 8) * r, cy + Math.sin(i * Math.PI / 4 + Math.PI / 8) * r);
    g.closePath(); g.fill();
  };
  if (kind === 'bukhara') {
    rect('#17100f', 0, 0, W, H); rect('#8f1d1f', 14, 22, W - 28, H - 44); rect('#17100f', 24, 32, W - 48, H - 64); rect('#a32426', 30, 38, W - 60, H - 76);
    for (let row = 0; row < 7; row++) for (let col = 0; col < 3; col++) {
      const cx = 64 + col * 64, cy = 74 + row * 61;
      octagon('#17100f', cx, cy, 24); octagon('#e8d9b8', cx, cy, 18); octagon('#a32426', cx, cy, 12); diamond('#17100f', cx, cy, 6, 6);
      if (col < 2) diamond('#17100f', cx + 32, cy + 30, 7, 9);
    }
  } else if (kind === 'medallion') {
    rect('#e3d3ac', 0, 0, W, H); rect('#3b1418', 12, 20, W - 24, H - 40); rect('#c9a66a', 22, 30, W - 44, H - 60); rect('#6e1826', 34, 42, W - 68, H - 84);
    for (let i = 0; i < 14; i++) { diamond('#6e1826', 28, 50 + i * 32, 5, 9); diamond('#6e1826', W - 28, 50 + i * 32, 5, 9); }
    diamond('#e3d3ac', W / 2, H / 2, 78, 150); diamond('#27395a', W / 2, H / 2, 62, 124); diamond('#c9a66a', W / 2, H / 2, 40, 82); diamond('#6e1826', W / 2, H / 2, 20, 42);
    for (const [x, y] of [[52, 66], [W - 52, 66], [52, H - 66], [W - 52, H - 66]]) { diamond('#e3d3ac', x, y, 16, 22); diamond('#27395a', x, y, 8, 12); }
  } else if (kind === 'deer') {
    rect('#3a2a1c', 0, 0, W, H); rect('#b89a5e', 10, 16, W - 20, H - 32); rect('#8fa7a6', 18, 24, W - 36, 210); rect('#3f5a36', 18, 200, W - 36, H - 224);
    g.fillStyle = '#2c4429'; for (let i = 0; i < 9; i++) { const x = 30 + i * 26 + random() * 8; g.beginPath(); g.moveTo(x, 60 + random() * 50); g.lineTo(x + 20, 250); g.lineTo(x - 20, 250); g.fill(); }
    rect('#5c7a43', 18, 330, W - 36, H - 354); rect('#6c8fa0', 40, 400, 150, 34);
    // The stag: body, neck, head, legs and antlers.
    g.fillStyle = '#8a5a2c'; g.beginPath(); g.ellipse(128, 300, 56, 30, 0, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.moveTo(160, 290); g.lineTo(186, 222); g.lineTo(206, 230); g.lineTo(184, 306); g.fill();
    g.beginPath(); g.ellipse(200, 222, 20, 11, -0.3, 0, Math.PI * 2); g.fill();
    for (const x of [86, 104, 152, 170]) rect('#7a4d24', x, 310, 9, 78);
    rect('#f0e6d0', 70, 292, 12, 14);
    g.strokeStyle = '#e9dcc0'; g.lineWidth = 5; g.lineCap = 'round';
    for (const d of [-1, 1]) { g.beginPath(); g.moveTo(194, 212); g.lineTo(194 + d * 20, 170); g.lineTo(194 + d * 34, 140); g.moveTo(194 + d * 14, 184); g.lineTo(194 + d * 34, 176); g.moveTo(194 + d * 20, 170); g.lineTo(194 + d * 6, 146); g.stroke(); }
  } else if (kind === 'runner') {
    rect('#2f5b3a', 0, 0, W, H);
    for (const [x, w, c] of [[0, 16, '#7b1b1e'], [16, 8, '#e0b93e'], [40, 12, '#b5262a'], [70, 6, '#e8dfc4'], [112, 32, '#b5262a'], [122, 12, '#e0b93e'], [180, 6, '#e8dfc4'], [204, 12, '#b5262a'], [232, 8, '#e0b93e'], [240, 16, '#7b1b1e']] as const) rect(c, x, 0, w, H);
  } else if (kind === 'roses') {
    rect('#1d3a2c', 0, 0, W, H); rect('#0f2219', 0, 0, W, 18); rect('#0f2219', 0, H - 18, W, 18); rect('#c7b071', 10, 26, W - 20, 5); rect('#c7b071', 10, H - 31, W - 20, 5);
    for (let i = 0; i < 26; i++) {
      const x = 30 + random() * (W - 60), y = 50 + random() * (H - 100), r = 14 + random() * 12;
      g.fillStyle = '#3f7a45'; g.beginPath(); g.ellipse(x - r, y + r * 0.6, r * 0.8, r * 0.35, 0.6, 0, 7); g.ellipse(x + r, y + r * 0.5, r * 0.8, r * 0.35, -0.6, 0, 7); g.fill();
      g.fillStyle = random() < 0.5 ? '#d9728c' : '#c22f44'; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
      g.fillStyle = '#f3c0cb'; g.beginPath(); g.arc(x - r * 0.2, y - r * 0.2, r * 0.45, 0, 7); g.fill();
      g.fillStyle = '#8c1c30'; g.beginPath(); g.arc(x, y, r * 0.2, 0, 7); g.fill();
    }
  } else {
    rect('#4b2c1a', 0, 0, W, H); rect('#d9c49a', 12, 18, W - 24, H - 36);
    for (let row = 0; row < 9; row++) for (let col = 0; col < 4; col++) {
      const cx = 40 + col * 58 + (row % 2) * 29 - 14, cy = 48 + row * 52;
      diamond('#4b2c1a', cx, cy, 30, 50); diamond('#d9731f', cx, cy, 23, 40); diamond('#f0c648', cx, cy, 12, 22); diamond('#4b2c1a', cx, cy, 4, 8);
    }
    rect('#4b2c1a', 0, 0, 12, H); rect('#4b2c1a', W - 12, 0, 12, H);
  }
  // Fringe on both short ends, then the grey of years of beating.
  if (kind !== 'runner') for (const y of [0, H - 10]) { rect('#e9e0c8', 0, y, W, 10); g.fillStyle = '#9a9079'; for (let x = 0; x < W; x += 6) g.fillRect(x, y, 2, 10); }
  g.fillStyle = `rgba(150,145,135,${fade})`; g.fillRect(0, 0, W, H);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

/** A rug hung over a bar at the origin: `front` metres hang towards +z, the rest behind. */
function drape(width: number, length: number, front: number, r: number, material: THREE.Material, phase: number) {
  const geometry = new THREE.PlaneGeometry(width, length, 10, 40);
  const p = geometry.attributes.position;
  const arc = Math.PI * r;
  const flare = (d: number, u: number) => 0.035 * d + 0.03 * Math.sin(u * 6 + phase + d * 2.5) * Math.min(d, 1);
  for (let i = 0; i < p.count; i++) {
    const u = p.getX(i), s = p.getY(i) + length / 2;
    let y: number, z: number;
    if (s < front) { const d = front - s; y = -d; z = r + flare(d, u); }
    else if (s < front + arc) { const t = (s - front) / r; y = r * Math.sin(t); z = r * Math.cos(t); }
    else { const d = s - front - arc; y = -d; z = -r - flare(d, u + 2); }
    p.setXYZ(i, u, y, z);
  }
  geometry.computeVertexNormals();
  const mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = mesh.receiveShadow = true;
  return mesh;
}

export default defineThing({
  questions: {
    frame: choice('What shape is the welded frame?', {
      goalpost: 'One plain П-shaped bar on two posts, exactly a goalpost.',
      ladder: 'Two posts with a high bar and a lower bar, good for climbing.',
      twin: 'A tall frame and a shorter one welded side by side, sharing a post.',
      braced: 'A single bar with slanted back braces, sturdy as a swing frame.',
    }),
    load: choice('What hangs on it right now?', {
      bare: 'Nothing: the bare frame alone in the yard.',
      rug: 'One big rug thrown over the top bar, mid-beating.',
      pair: 'A rug and a small bedside mat sharing the bar.',
      fallen: 'The rug has slid off and lies crumpled in the snow underneath.',
    }),
    pattern: choice('If there is a rug, what is its pattern?', PATTERNS),
    paint: choice('What colour was the frame painted?', {
      blue: 'Municipal sky blue.',
      green: 'Dark fence green.',
      primer: 'Red-brown primer that never got a top coat.',
      silver: 'Aluminium silver paint, like the heating pipes.',
      yellow: 'Playground yellow.',
    }),
    beater: choice('Where is the wicker carpet beater?', {
      hung: 'Hanging from the bar by its loop.',
      leaning: 'Leaning against a post.',
      dropped: 'Lying in the snow where someone put it down.',
      none: 'Taken back upstairs.',
    }),
    left: choice('What did a child leave behind under it?', {
      nothing: 'Nothing.',
      mitten: 'One small red mitten on a string, dropped from the bar.',
      ball: 'A scuffed football by the post that serves as a goal.',
      sled: 'A little wooden sled propped against a post.',
      satchel: 'A school satchel dumped on the ground.',
    }),
    snow: score('How much snow is on the ground around it?', ['Bare mud and puddles', 'Patchy grey slush', 'Trampled snow', 'Deep fresh snow']),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const R = 0.032;
    const paintColour = new THREE.Color({ blue: '#4d86b8', green: '#2f5e42', primer: '#8a4332', silver: '#b4b8b8', yellow: '#d9ae2c' }[a.paint]);
    paintColour.lerp(new THREE.Color('#7a6f66'), mood.wear * 0.35);
    const paint = s.material(paintColour, { metalness: a.paint === 'silver' ? 0.5 : 0.15, roughness: 0.55 });
    const rust = s.material('#6b3a22', { roughness: 0.95 });
    const snowMat = new THREE.MeshStandardMaterial({ color: new THREE.Color('#eef1f5').lerp(new THREE.Color('#ffe9cf'), mood.warmth * 0.25), roughness: 0.95 });

    const pipe = (from: P3, to: P3) => {
      s.rod(from, to, R, paint);
      // Rust blooms as short sleeves where the paint has gone.
      const blooms = Math.floor(mood.wear * 3 + random() * 1.5);
      for (let i = 0; i < blooms; i++) {
        const t = random(), u = Math.min(1, t + 0.04 + random() * 0.06);
        s.rod([mix(from[0], to[0], t), mix(from[1], to[1], t), mix(from[2], to[2], t)], [mix(from[0], to[0], u), mix(from[1], to[1], u), mix(from[2], to[2], u)], R * 1.06, rust);
      }
    };
    const elbow = (at: P3) => s.ball([R * 1.15, R * 1.15, R * 1.15], at, paint, 10);

    const tall = 2.05 + random() * 0.1, half = a.frame === 'twin' ? 0.95 : 1.15;
    const sag = mood.wear * 0.05;
    const bars: { x0: number; x1: number; y: number }[] = [];
    const posts: P3[] = [];
    const post = (x: number, h: number) => { pipe([x, -0.04, 0], [x, h, 0]); elbow([x, h, 0]); posts.push([x, 0, 0]); s.cylinder(0.09, 0.11, 0.05, [x, 0.02, 0], s.material('#9b9a94'), 10); };
    const bar = (x0: number, x1: number, y: number) => {
      const mid = (x0 + x1) / 2;
      pipe([x0, y, 0], [mid, y - sag, 0]); pipe([mid, y - sag, 0], [x1, y, 0]);
      bars.push({ x0, x1, y: y - sag / 2 });
    };
    if (a.frame === 'twin') {
      const x0 = -1.75, x1 = 0.15, x2 = 1.75, low = 1.35;
      post(x0, tall); post(x1, tall); post(x2, low);
      bar(x0, x1, tall); bar(x1, x2, low);
    } else {
      post(-half, tall); post(half, tall); bar(-half, half, tall);
      if (a.frame === 'ladder') { bar(-half, half, 1.25); bars.pop(); pipe([-half, 0.55, 0], [half, 0.55, 0]); }
      if (a.frame === 'braced') for (const x of [-half, half]) { pipe([x, tall - 0.05, 0], [x, -0.04, -1.0]); pipe([x, 0.6, 0], [x, 0.6, -0.72]); }
    }
    const top = bars[0];
    const centre = (top.x0 + top.x1) / 2, span = top.x1 - top.x0;

    // Ground: a trampled oval, darker and muddier where the snow is thin.
    const groundR = (a.frame === 'twin' ? 2.05 : 1.45);
    const earth = new THREE.Color('#5d5246').lerp(new THREE.Color('#dfe3e6'), Math.min(1, a.snow * 1.25));
    const pad = s.cylinder(groundR, groundR + 0.08, 0.05, [0, -0.02, -0.15], new THREE.MeshStandardMaterial({ color: earth, roughness: 1 }), 40);
    pad.scale.z = 0.72;
    const patches: { at: P3; size: number; color: string }[] = [];
    const patchCount = 14 + Math.floor(mood.density * 10);
    for (let i = 0; i < patchCount; i++) {
      const angle = random() * Math.PI * 2, d = Math.sqrt(random()) * (groundR - 0.25);
      patches.push({ at: [Math.cos(angle) * d, 0.005, Math.sin(angle) * d * 0.7 - 0.15], size: 0.1 + random() * 0.22, color: a.snow > 0.45 ? (random() < 0.5 ? '#b9bcbc' : '#8d8478') : random() < a.snow * 2 ? '#e9edf0' : '#3f372f' });
    }
    const blob = new THREE.SphereGeometry(1, 8, 6); blob.scale(1, 0.12, 0.7);
    s.scatter(blob, new THREE.MeshStandardMaterial({ roughness: 1 }), patches);
    if (a.snow > 0.6) {
      for (const b of bars) { const cap = s.rod([b.x0 + 0.05, b.y + R, 0], [b.x1 - 0.05, b.y + R, 0], R * 0.9, snowMat); cap.scale.x = 1.2; }
      for (const p of posts) s.ball([0.2, 0.07, 0.2], [p[0], 0.03, 0], snowMat, 10);
    }

    // The rug.
    const fade = mix(0.05, 0.4, mood.wear) + (1 - mood.cheer) * 0.12;
    let swing: THREE.Group | null = null;
    if (a.load !== 'bare') {
      const texture = rugTexture(a.pattern, random, fade);
      const rugMat = new THREE.MeshStandardMaterial({ map: texture, roughness: 0.95, side: THREE.DoubleSide });
      const isRunner = a.pattern === 'runner';
      const width = Math.min(isRunner ? 0.8 : 1.45, span - 0.35), length = isRunner ? 3.0 : 2.3;
      if (a.load === 'fallen') {
        const geometry = new THREE.PlaneGeometry(width, length * 0.62, 12, 24);
        const p = geometry.attributes.position;
        for (let i = 0; i < p.count; i++) {
          const x = p.getX(i), y = p.getY(i);
          p.setZ(i, 0.07 + 0.05 * Math.sin(x * 7 + y * 3) + 0.11 * Math.max(0, Math.sin(y * 6.5 + 1)) + Math.max(0, y - length * 0.12) * 0.6);
        }
        geometry.computeVertexNormals();
        const heap = new THREE.Mesh(geometry, rugMat);
        heap.rotation.x = -Math.PI / 2; heap.rotation.z = (random() - 0.5) * 0.5;
        heap.position.set(centre + (random() - 0.5) * 0.2, 0.01, 0.3);
        heap.castShadow = heap.receiveShadow = true;
        s.root.add(heap);
      } else {
        swing = new THREE.Group();
        swing.position.set(0, top.y, 0);
        s.root.add(swing);
        const pair = a.load === 'pair';
        const front = Math.min(mix(1.0, 1.55, random()), top.y - 0.25);
        const rug = drape(pair ? width * 0.8 : width, length, front, R + 0.012, rugMat, random() * 6);
        rug.position.x = centre + (pair ? -span * 0.18 : (random() - 0.5) * 0.2);
        swing.add(rug);
        if (pair) {
          const other = (Object.keys(PATTERNS) as (keyof typeof PATTERNS)[]).filter((k) => k !== a.pattern && k !== 'runner' && k !== 'deer');
          const matTexture = rugTexture(other[Math.floor(random() * other.length)], random, fade);
          matTexture.repeat.set(1, 0.5);
          const mat = drape(0.5, 0.95, 0.5, R + 0.012, new THREE.MeshStandardMaterial({ map: matTexture, roughness: 0.95, side: THREE.DoubleSide }), random() * 6);
          mat.position.x = centre + span * 0.33;
          swing.add(mat);
        }
      }
    }

    // The beater: a wicker pretzel on a handle, built upright with the handle end at the origin.
    if (a.beater !== 'none') {
      const b = new Sculpture(context);
      const wicker = b.material('#c79a55', { roughness: 0.8 });
      b.rod([0, 0, 0], [0, 0.42, 0], 0.012, wicker);
      b.tube([[0, 0.4, 0], [-0.1, 0.5, 0.004], [-0.13, 0.62, 0], [-0.06, 0.72, -0.004], [0.05, 0.62, 0.004], [0, 0.52, 0], [-0.05, 0.62, -0.004], [0.06, 0.72, 0.004], [0.13, 0.62, 0], [0.1, 0.5, -0.004], [0, 0.4, 0]], 0.009, wicker);
      b.ring(0.03, 0.006, [0, -0.03, 0], wicker);
      for (const y of [0.05, 0.2, 0.38]) b.cylinder(0.016, 0.016, 0.03, [0, y, 0], b.material('#8a6a3a'), 8);
      const g = b.root;
      const px = posts[posts.length - 1][0];
      if (a.beater === 'hung') { g.rotation.z = Math.PI + (random() - 0.5) * 0.15; g.position.set(top.x1 - 0.22, top.y - R - 0.005, 0.02); }
      else if (a.beater === 'leaning') { g.rotation.z = 0.28; g.position.set(px + 0.26, 0.02, 0.06); }
      else { g.rotation.x = Math.PI / 2 - 0.04; g.rotation.z = 0.7 + random(); g.position.set(centre + 0.3 + random() * 0.4, 0.05, 0.75); }
      s.root.add(g);
    }

    // What a child left behind.
    const lx = posts[0][0];
    if (a.left === 'mitten') {
      const wool = s.material('#c8242c', { roughness: 1 });
      const mx = centre - 0.35 + random() * 0.3;
      s.ball([0.075, 0.035, 0.1], [mx, 0.04, 0.5], wool, 12);
      s.ball([0.03, 0.028, 0.045], [mx + 0.075, 0.035, 0.52], wool, 10);
      s.cylinder(0.062, 0.066, 0.05, [mx, 0.04, 0.4], s.material('#f1ece0', { roughness: 1 }), 10).rotation.x = Math.PI / 2;
      s.tube([[mx, 0.03, 0.38], [mx + 0.1, 0.015, 0.25], [mx + 0.02, 0.015, 0.1], [mx + 0.16, 0.015, -0.02]], 0.006, s.material('#e9e4d8'));
    } else if (a.left === 'ball') {
      const bx = lx + 0.35;
      s.ball([0.11, 0.11, 0.11], [bx, 0.11, 0.35], s.material('#e7e2d4', { roughness: 0.8 }), 16);
      const spots: { at: P3; size: number }[] = [];
      for (let i = 0; i < 12; i++) { const v = new THREE.Vector3(random() - 0.5, random() - 0.5, random() - 0.5).normalize().multiplyScalar(0.098); spots.push({ at: [bx + v.x, 0.11 + v.y, 0.35 + v.z], size: 0.03 }); }
      s.scatter(new THREE.SphereGeometry(1, 6, 5), s.material('#26262a'), spots);
    } else if (a.left === 'sled') {
      const sl = new Sculpture(context);
      const wood = sl.material('#b98845'), iron = sl.material('#51585c', { metalness: 0.5 });
      for (let i = 0; i < 5; i++) sl.box([0.055, 0.015, 0.75], [-0.14 + i * 0.07, 0.2, 0], i % 2 ? sl.material('#b5332c') : wood);
      for (const x of [-0.16, 0.16]) { sl.tube([[x, 0.2, 0.42], [x, 0.1, 0.47], [x, 0.012, 0.36], [x, 0.012, -0.38]], 0.011, iron); for (const z of [-0.25, 0.2]) sl.rod([x, 0.012, z], [x, 0.2, z], 0.009, iron); }
      sl.tube([[-0.16, 0.2, 0.4], [0, 0.03, 0.9], [0.16, 0.2, 0.4]], 0.006, sl.material('#d8cfb8'));
      sl.root.rotation.x = -Math.PI / 2 + 0.3; sl.root.rotation.y = 0.2; sl.root.position.set(lx - 0.05, 0.42, 0.22);
      s.root.add(sl.root);
    } else if (a.left === 'satchel') {
      const leather = s.material('#7a3f24');
      const bx = lx + 0.4;
      s.box([0.34, 0.26, 0.13], [bx, 0.14, 0.4], leather).rotation.z = 0.12;
      s.box([0.35, 0.12, 0.14], [bx - 0.01, 0.23, 0.405], s.material('#5d2e19')).rotation.z = 0.12;
      for (const x of [-0.08, 0.08]) s.box([0.035, 0.05, 0.01], [bx + x, 0.17, 0.475], s.material('#c9b46a', { metalness: 0.6 }));
      s.tube([[bx - 0.12, 0.25, 0.34], [bx - 0.2, 0.12, 0.2], [bx - 0.05, 0.02, 0.15]], 0.012, leather);
    }

    const amount = mix(0.004, 0.05, mood.energy), phase = random() * 6;
    return s.finish({ update: (_dt, time) => { if (swing) swing.rotation.x = Math.sin(time * 1.3 + phase) * amount; } });
  },
});
