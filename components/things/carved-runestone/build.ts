import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';

type P2 = [number, number];

// Younger Futhark staves as strokes in a unit box, y down.
const RUNES: number[][][] = [
  [[0.3, 0, 0.3, 1], [0.3, 0.5, 0.8, 0.15], [0.3, 0.78, 0.8, 0.42]],
  [[0.25, 0, 0.25, 1], [0.25, 0, 0.75, 0.4], [0.75, 0.4, 0.75, 1]],
  [[0.3, 0, 0.3, 1], [0.3, 0.25, 0.75, 0.5], [0.75, 0.5, 0.3, 0.75]],
  [[0.5, 0, 0.5, 1], [0.5, 0.3, 0.85, 0.5], [0.5, 0.55, 0.85, 0.75]],
  [[0.3, 0, 0.3, 1], [0.3, 0, 0.75, 0.25], [0.75, 0.25, 0.3, 0.5], [0.3, 0.5, 0.8, 1]],
  [[0.3, 0, 0.3, 1], [0.3, 0.55, 0.8, 0.1]],
  [[0.5, 0, 0.5, 1], [0.2, 0.3, 0.8, 0.7], [0.8, 0.3, 0.2, 0.7]],
  [[0.5, 0, 0.5, 1], [0.25, 0.4, 0.75, 0.6]],
  [[0.5, 0, 0.5, 1]],
  [[0.5, 0, 0.5, 1], [0.25, 0.6, 0.75, 0.4]],
  [[0.5, 0, 0.5, 1], [0.5, 0, 0.2, 0.3], [0.5, 0, 0.8, 0.3]],
  [[0.3, 0, 0.3, 1], [0.3, 0, 0.7, 0.25], [0.7, 0.25, 0.3, 0.5], [0.3, 0.5, 0.7, 0.75], [0.7, 0.75, 0.3, 1]],
  [[0.5, 0, 0.5, 1], [0.5, 0.45, 0.2, 0.05], [0.5, 0.45, 0.8, 0.05]],
  [[0.3, 0, 0.3, 1], [0.3, 0, 0.75, 0.35]],
  [[0.5, 0, 0.5, 1], [0.5, 0.55, 0.2, 0.95], [0.5, 0.55, 0.8, 0.95]],
];

const STONES = {
  grey: ['#9a9c9b', '#6f7273', '#c4c6c2'],
  pink: ['#b39a90', '#8a6a62', '#d8c8bf'],
  dark: ['#6a6d72', '#45484d', '#8e9297'],
  pale: ['#c9c2ae', '#a39b85', '#e5dfcd'],
  slate: ['#7f8c96', '#56636d', '#a9b6bf'],
} as const;

function insetPolygon(points: P2[], distance: number): P2[] {
  const n = points.length;
  return points.map((p, i) => {
    const before = points[(i + n - 1) % n], after = points[(i + 1) % n];
    const tx = after[0] - before[0], ty = after[1] - before[1], length = Math.hypot(tx, ty) || 1;
    // The outline runs clockwise from bottom left, so the inside is to the right of travel.
    return [p[0] + (ty / length) * distance, p[1] - (tx / length) * distance] as P2;
  });
}

export default defineThing({
  questions: {
    form: choice('What shape is the slab?', {
      pointed: 'A tall slab tapering to a blunt point, like a spearhead.',
      rounded: 'A tall slab with a smooth arched top.',
      broad: 'A wide heavy boulder face, almost as broad as it is tall.',
      pillar: 'A narrow standing pillar, more post than slab.',
    }),
    stone: choice('What stone is it?', {
      grey: 'Speckled grey granite.',
      pink: 'Warm pink-red granite.',
      dark: 'Dark blue-black gneiss.',
      pale: 'Pale buff limestone.',
      slate: 'Blue-grey slate with a flat cleft face.',
    }),
    paint: choice('How are the carvings coloured?', {
      red: 'Every groove filled with blood-red ochre.',
      'red-black': 'Red runes inside black serpent lines.',
      whitewash: 'The rune band whitewashed, with red runes bright against it.',
      bare: 'No paint at all: only the grey cut grooves.',
    }),
    motif: choice('What is carved in the middle of the serpent band?', {
      cross: 'A ringed cross, from the years after the conversion.',
      ship: 'A small longship under sail, for a man lost at sea.',
      hammer: 'A Thor\'s hammer.',
      knot: 'A looping interlace knot.',
      none: 'Nothing: bare stone inside the band.',
    }),
    fate: choice('What has become of the stone?', {
      standing: 'It stands as raised, wedged with packing stones on a low turf mound.',
      sinking: 'It is being swallowed: half sunk, deep in long grass.',
      broken: 'The top has snapped off and lies at its foot.',
      fallen: 'It has gone over onto its back and lies face to the sky.',
    }),
    lean: score('If it still stands, how far does it lean?', ['Bolt upright', 'A slight tilt', 'Leaning hard', 'About to go over']),
    offering: choice('What has been left at its foot?', {
      nothing: 'Nothing.',
      flowers: 'A wreath of flowers and a small bowl.',
      weapons: 'A sword thrust into the turf and a shield leaned against the stone.',
      cairn: 'A little cairn of pebbles added one by one by passers-by.',
      tools: 'The carver\'s mallet and chisel among fresh stone chips.',
    }),
    size: score('How big is it?', ['Waist-high marker', 'As tall as a man', 'Twice a man\'s height']),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const H = mix(1.1, 3.6, a.size);
    const W = H * { pointed: 0.48, rounded: 0.5, broad: 0.8, pillar: 0.27 }[a.form];
    const T = Math.max(0.16, W * 0.26);
    const [base, speck, light] = STONES[a.stone];

    // Outline, clockwise from bottom left.
    const half = (v: number) => {
      const w = W / 2;
      if (a.form === 'pointed') return Math.max(0.03 * W, w * (0.82 + 0.18 * Math.sin(v * 2.4)) * Math.pow(1 - v ** 2.6, 0.75));
      if (a.form === 'broad') return w * (0.82 + 0.2 * Math.sin(v * 2.6)) * Math.pow(Math.max(0, 1 - v ** 4), 0.5);
      if (a.form === 'pillar') return w * (0.9 + 0.1 * Math.sin(v * 3)) * Math.pow(Math.max(0, 1 - v ** 9), 0.5);
      return w * (0.9 + 0.1 * Math.sin(v * 2.5)) * Math.pow(Math.max(0, 1 - v ** 5), 0.5);
    };
    const N = 22, skew = (random() - 0.5) * 0.16 * W;
    const breakAt = a.fate === 'broken' ? mix(0.55, 0.75, random()) : 2, breakSlope = (random() - 0.5) * 0.5;
    const outline: P2[] = [];
    const jitter = () => (random() - 0.5) * 0.025 * W;
    const edge = (v: number, side: number): P2 => {
      const x = side * half(v) + skew * Math.sin(v * Math.PI * 0.9) + jitter();
      const limit = H * breakAt + x * breakSlope + (random() - 0.5) * 0.05 * H;
      return [x, Math.min(v * H + (v > 0.05 ? jitter() : 0), limit)];
    };
    for (let i = 0; i <= N; i++) outline.push(edge(i / N, -1));
    for (let i = N; i >= 0; i--) outline.push(edge(i / N, 1));
    const topY = Math.max(...outline.map((p) => p[1]));
    const shape = new THREE.Shape(outline.map(([x, y]) => new THREE.Vector2(x, y)));

    // Granite speckle shared by the body and the carved face.
    const speckle = (ctx: CanvasRenderingContext2D, w: number, h: number, count: number) => {
      ctx.fillStyle = base; ctx.fillRect(0, 0, w, h);
      for (let i = 0; i < count; i++) {
        ctx.fillStyle = random() < 0.5 ? speck : light;
        ctx.globalAlpha = 0.25 + random() * 0.4;
        const r = 0.6 + random() * 1.8;
        ctx.fillRect(random() * w, random() * h, r * (1 + random() * 2), r);
      }
      ctx.globalAlpha = 1;
    };
    const lichen = (ctx: CanvasRenderingContext2D, w: number, h: number, count: number) => {
      for (let i = 0; i < count; i++) {
        const x = random() * w, y = random() * h, r = 6 + random() * 22;
        ctx.fillStyle = ['#c9b548', '#aab4a0', '#d8d6c2', '#7f8f5a'][Math.floor(random() * 4)];
        for (let b = 0; b < 9; b++) {
          ctx.globalAlpha = 0.35 + random() * 0.4;
          ctx.beginPath(); ctx.arc(x + (random() - 0.5) * r * 1.6, y + (random() - 0.5) * r * 1.6, r * (0.2 + random() * 0.4), 0, 7); ctx.fill();
        }
      }
      ctx.globalAlpha = 1;
    };
    const bodyCanvas = document.createElement('canvas');
    bodyCanvas.width = bodyCanvas.height = 256;
    const bodyCtx = bodyCanvas.getContext('2d')!;
    speckle(bodyCtx, 256, 256, 2600);
    lichen(bodyCtx, 256, 256, Math.round(mood.wear * 10));
    const bodyTexture = new THREE.CanvasTexture(bodyCanvas);
    bodyTexture.colorSpace = THREE.SRGBColorSpace;
    bodyTexture.wrapS = bodyTexture.wrapT = THREE.RepeatWrapping;
    bodyTexture.repeat.set(1.4 / W, 1.4 / W);
    const granite = new THREE.MeshStandardMaterial({ map: bodyTexture, roughness: 0.92 });

    // The carved face.
    const CW = 512, CH = Math.min(1400, Math.round((512 * topY) / W));
    const canvas = document.createElement('canvas');
    canvas.width = CW; canvas.height = CH;
    const ctx = canvas.getContext('2d')!;
    speckle(ctx, CW, CH, 5200 * (CH / 512));
    const minX = Math.min(...outline.map((p) => p[0])), maxX = Math.max(...outline.map((p) => p[0]));
    const px = (p: P2): P2 => [((p[0] - minX) / (maxX - minX)) * CW, (1 - p[1] / topY) * CH];
    const unit = CW / (maxX - minX);
    const band = Math.min(0.14 * W, 0.2) * (a.form === 'pillar' ? 1.5 : 1);
    const inner = insetPolygon(outline, band * 0.5 + 0.035 * W).filter((p) => p[1] > 0.14 * H && p[1] < topY - band * 0.4);
    // Head curls in at the left foot, tail crosses it from the right.
    const first = inner[0], last = inner[inner.length - 1];
    const path: P2[] = [
      [first[0] + 0.5 * (maxX - minX), first[1] + 0.13 * H], [first[0] + 0.3 * (maxX - minX), first[1] + 0.03 * H],
      ...inner,
      [last[0] - 0.3 * (maxX - minX), last[1] - 0.02 * H], [last[0] - 0.56 * (maxX - minX), last[1] + 0.07 * H],
    ];
    const curve = new THREE.CatmullRomCurve3(path.map((p) => new THREE.Vector3(...px(p), 0)), false, 'centripetal');
    const bandPx = band * unit;
    const walk = curve.getSpacedPoints(Math.max(8, Math.round(curve.getLength() / (bandPx * 0.6))));
    const fade = 1 - mood.wear * 0.62;
    const red = '#a8231a', black = '#1d1b1a';
    const lineColour = a.paint === 'red-black' ? black : red;
    const trace = (width: number, colour: string, alpha: number) => {
      ctx.strokeStyle = colour; ctx.globalAlpha = alpha; ctx.lineWidth = width; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.beginPath();
      walk.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
      ctx.stroke();
      ctx.globalAlpha = 1;
    };
    const groove = '#4c4d4e';
    // Serpent body: two cut rails with a clear band between them.
    trace(bandPx + 9, groove, 0.9);
    if (a.paint !== 'bare') trace(bandPx + 9, lineColour, fade);
    trace(bandPx - 1, base, 1);
    if (a.paint === 'whitewash') trace(bandPx - 1, '#e9e4d6', fade * 0.9);
    const cut = (draw: () => void, width: number, colour: string) => {
      ctx.lineCap = 'round';
      ctx.strokeStyle = groove; ctx.fillStyle = groove; ctx.globalAlpha = 0.9; ctx.lineWidth = width + 1; draw();
      if (a.paint !== 'bare') { ctx.strokeStyle = colour; ctx.fillStyle = colour; ctx.globalAlpha = fade; ctx.lineWidth = width; draw(); }
      ctx.globalAlpha = 1;
    };
    // Runes ride the band, staves across it, with a divider between words.
    let wordLeft = 2 + Math.floor(random() * 4);
    for (let i = 3; i < walk.length - 4; i++) {
      const p = walk[i], q = walk[i + 1], angle = Math.atan2(q.y - p.y, q.x - p.x);
      ctx.save();
      ctx.translate(p.x, p.y); ctx.rotate(angle);
      const gw = bandPx * 0.5, gh = bandPx * 0.74;
      if (wordLeft-- === 0) {
        wordLeft = 2 + Math.floor(random() * 5);
        cut(() => { for (const y of [-0.2, 0.2]) { ctx.beginPath(); ctx.arc(0, y * gh, 2.2, 0, 7); ctx.fill(); } }, 2, red);
      } else {
        const rune = RUNES[Math.floor(random() * RUNES.length)];
        cut(() => { ctx.beginPath(); for (const [x0, y0, x1, y1] of rune) { ctx.moveTo((x0 - 0.5) * gw, (y0 - 0.5) * gh); ctx.lineTo((x1 - 0.5) * gw, (y1 - 0.5) * gh); } ctx.stroke(); }, Math.max(2.5, bandPx * 0.085), red);
      }
      ctx.restore();
    }
    // Head with an eye and a lappet; a pointed tail.
    const headAt = walk[0], headNext = walk[1];
    ctx.save();
    ctx.translate(headAt.x, headAt.y); ctx.rotate(Math.atan2(headAt.y - headNext.y, headAt.x - headNext.x));
    cut(() => { ctx.beginPath(); ctx.ellipse(bandPx * 0.5, 0, bandPx * 0.95, bandPx * 0.62, 0, 0, 7); ctx.fill(); }, 2, lineColour);
    ctx.fillStyle = base; ctx.beginPath(); ctx.ellipse(bandPx * 0.5, 0, bandPx * 0.78, bandPx * 0.46, 0, 0, 7); ctx.fill();
    cut(() => { ctx.beginPath(); ctx.arc(bandPx * 0.6, -bandPx * 0.05, bandPx * 0.14, 0, 7); ctx.fill(); ctx.beginPath(); ctx.moveTo(bandPx * 1.3, 0); ctx.quadraticCurveTo(bandPx * 2, bandPx * 0.5, bandPx * 1.7, -bandPx * 0.7); ctx.stroke(); }, 3, lineColour);
    ctx.restore();
    // Central motif.
    const middle = px([skew * 0.6, topY * 0.5]);
    const m = Math.max(0.2, (half(0.5) * 2 - band * 2.6) * 0.42) * unit;
    ctx.save();
    ctx.translate(middle[0], middle[1]);
    const motifWidth = Math.max(4, bandPx * 0.16);
    if (a.form !== 'pillar') {
      if (a.motif === 'cross') cut(() => {
        ctx.beginPath(); ctx.moveTo(0, -m); ctx.lineTo(0, m * 1.3); ctx.moveTo(-m * 0.8, -m * 0.15); ctx.lineTo(m * 0.8, -m * 0.15); ctx.stroke();
        ctx.beginPath(); ctx.arc(0, -m * 0.15, m * 0.5, 0, 7); ctx.stroke();
      }, motifWidth, red);
      if (a.motif === 'hammer') cut(() => {
        ctx.beginPath(); ctx.moveTo(0, -m); ctx.lineTo(0, m * 0.5); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(-m * 0.75, m * 0.45); ctx.lineTo(m * 0.75, m * 0.45); ctx.lineTo(m * 0.5, m); ctx.lineTo(-m * 0.5, m); ctx.closePath(); ctx.stroke();
        ctx.beginPath(); ctx.arc(0, -m * 1.1, m * 0.14, 0, 7); ctx.stroke();
      }, motifWidth, red);
      if (a.motif === 'ship') cut(() => {
        ctx.beginPath(); ctx.moveTo(-m, 0.1 * m); ctx.quadraticCurveTo(0, m * 0.9, m, 0.1 * m); ctx.moveTo(-m, 0.1 * m); ctx.lineTo(-m * 1.05, -m * 0.3); ctx.moveTo(m, 0.1 * m); ctx.lineTo(m * 1.05, -m * 0.3);
        ctx.moveTo(-m * 0.85, 0.2 * m); ctx.lineTo(m * 0.85, 0.2 * m); ctx.moveTo(0, 0.2 * m); ctx.lineTo(0, -m * 1.1); ctx.stroke();
        ctx.strokeRect(-m * 0.6, -m * 1.0, m * 1.2, m * 0.75);
        for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.arc(i * m * 0.3, 0.36 * m, m * 0.1, 0, 7); ctx.stroke(); }
      }, motifWidth * 0.8, red);
      if (a.motif === 'knot') cut(() => {
        for (const turn of [0, 1, 2]) { ctx.save(); ctx.rotate((turn * Math.PI * 2) / 3); ctx.beginPath(); ctx.ellipse(0, -m * 0.4, m * 0.34, m * 0.7, 0, 0, 7); ctx.stroke(); ctx.restore(); }
      }, motifWidth * 0.8, lineColour);
    }
    ctx.restore();
    lichen(ctx, CW, CH, Math.round(mood.wear * 16 * (CH / 512)));
    const faceTexture = new THREE.CanvasTexture(canvas);
    faceTexture.colorSpace = THREE.SRGBColorSpace;
    faceTexture.anisotropy = 4;

    // Assemble the slab so that it can be leaned or laid down as one piece.
    const slab = new Sculpture(context);
    const bevel = 0.03 + T * 0.08;
    const body = new THREE.ExtrudeGeometry(shape, { depth: T - bevel * 2, bevelEnabled: true, bevelSize: bevel, bevelThickness: bevel, bevelSegments: 2, curveSegments: 1 });
    body.translate(0, 0, -T / 2 + bevel);
    slab.mesh(body, granite);
    const face = new THREE.ShapeGeometry(shape);
    const uv = face.attributes.uv, at = face.attributes.position;
    for (let i = 0; i < at.count; i++) uv.setXY(i, (at.getX(i) - minX) / (maxX - minX), at.getY(i) / topY);
    slab.mesh(face, new THREE.MeshStandardMaterial({ map: faceTexture, roughness: 0.9, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }), [0, 0, T / 2 + 0.004]);
    s.root.add(slab.root);

    const fallen = a.fate === 'fallen';
    const sink = a.fate === 'sinking' ? H * 0.24 : H * 0.07;
    const side = random() < 0.5 ? -1 : 1;
    if (fallen) {
      slab.root.rotation.set(-Math.PI / 2 + 0.14, 0, 0);
      slab.root.rotation.y = (random() - 0.5) * 0.4;
      slab.root.position.set(0, T * 0.45, H * 0.45);
      s.ball([W * 0.35, T * 0.9, W * 0.3], [(random() - 0.5) * W * 0.3, T * 0.2, -H * 0.3], granite, 10);
    } else {
      const lean = a.lean * (a.fate === 'sinking' ? 1.25 : 1);
      slab.root.rotation.z = side * mix(0.0, 0.3, lean);
      slab.root.rotation.x = -mix(0.02, 0.2, lean) * (0.5 + random() * 0.5);
      slab.root.position.y = -sink;
    }

    // Bake the pose and press anything below the turf flat, so the buried foot never hangs under the ground.
    slab.root.updateMatrix();
    for (const child of slab.root.children as THREE.Mesh[]) {
      child.updateMatrix();
      child.geometry.applyMatrix4(slab.root.matrix.clone().multiply(child.matrix));
      child.position.set(0, 0, 0); child.rotation.set(0, 0, 0); child.updateMatrix();
      const position = child.geometry.attributes.position;
      for (let i = 0; i < position.count; i++) if (position.getY(i) < 0.01) position.setY(i, 0.01);
      position.needsUpdate = true;
    }
    slab.root.position.set(0, 0, 0); slab.root.rotation.set(0, 0, 0);

    // Turf mound, packing stones and grass.
    const turf = s.material(new THREE.Color('#6f7f4a').lerp(new THREE.Color('#8a7f5c'), mix(0.6, 0.1, mood.warmth)));
    const moundR = Math.max(W * 0.95, 0.7);
    s.ball([moundR * (fallen ? 1.2 : 1), 0.16 + H * 0.03, fallen ? H * 0.75 : moundR * 0.8], [0, 0, 0], turf, 18);
    const stoneMat = s.material(base);
    if (!fallen) {
      const count = a.fate === 'sinking' ? 3 : 7 + Math.floor(random() * 4);
      for (let i = 0; i < count; i++) {
        const angle = (i / count) * Math.PI * 2 + random() * 0.5, r = 0.1 + random() * 0.1 + H * 0.02;
        s.ball([r * 1.3, r * 0.8, r], [Math.cos(angle) * (W * 0.5 + r * 0.6), 0.12, Math.sin(angle) * (T * 0.7 + r * 0.8)], stoneMat, 8).rotation.y = random() * 3;
      }
    }
    if (a.fate === 'broken') {
      const chunk = new THREE.Shape([[-0.5, 0], [-0.42, 0.3], [-0.1, 0.5], [0.3, 0.42], [0.5, 0.05], [0.2, -0.08]].map(([x, y]) => new THREE.Vector2(x * W * 0.95, y * H * 0.45)));
      const piece = s.mesh(new THREE.ExtrudeGeometry(chunk, { depth: T * 0.8, bevelEnabled: true, bevelSize: bevel, bevelThickness: bevel, bevelSegments: 1 }), granite, [side * W * 0.5, 0.1, T * 1.4 + H * 0.12]);
      piece.rotation.set(-Math.PI / 2 + 0.2, 0, random() * 2 - 1);
    }
    const tufts: { at: [number, number, number]; size: number; color: string }[] = [];
    const grassCount = Math.round(mix(14, 60, mood.density) * (a.fate === 'sinking' ? 1.7 : 1) * mix(0.7, 1.5, mood.wear));
    for (let i = 0; i < grassCount; i++) {
      const angle = random() * Math.PI * 2, r = moundR * (0.35 + random() * 0.75);
      tufts.push({ at: [Math.cos(angle) * r, 0.1, Math.sin(angle) * r * 0.85 + (fallen ? (random() - 0.5) * H * 0.8 : 0)], size: (a.fate === 'sinking' ? 1.5 : 1) * (0.5 + random() * 0.8) * mix(0.8, 1.3, a.size), color: ['#7c8c4e', '#93975a', '#a8a26a', '#5f7446'][Math.floor(random() * 4)] });
    }
    const blade = new THREE.ConeGeometry(0.022, 0.34, 4);
    blade.translate(0, 0.17, 0);
    s.scatter(blade, s.material('#ffffff'), tufts);

    // Offerings.
    const front = T * 0.5 + 0.35 + (fallen ? H * 0.9 : 0);
    if (a.offering === 'flowers') {
      s.ring(0.22, 0.045, [-W * 0.2, 0.2, front], s.material('#5f7a3c')).rotation.x = -1.1;
      const petals = Array.from({ length: 16 }, (_u, i) => ({ at: [-W * 0.2 + Math.cos(i * 0.4) * 0.22, 0.22 + Math.sin(i * 0.4) * 0.1, front + Math.sin(i * 0.4) * 0.19] as [number, number, number], size: 0.035 + random() * 0.02, color: ['#f1e9c9', '#d9a8c0', '#e4c94e', '#b9c7ee'][i % 4] }));
      s.scatter(new THREE.SphereGeometry(1, 6, 5), s.material('#ffffff'), petals);
      s.lathe([[0, 0], [0.09, 0.01], [0.14, 0.09], [0.12, 0.09], [0.08, 0.03], [0, 0.03]], s.material('#8a5b3c'), [W * 0.25, 0.12, front + 0.05]);
    }
    if (a.offering === 'weapons') {
      const steel = s.material('#b5b9bd', { metalness: 0.7, roughness: 0.35 });
      const x = -side * W * 0.42;
      s.box([0.055, 0.75, 0.012], [x, 0.5, front], steel).rotation.z = 0.08;
      s.box([0.22, 0.03, 0.035], [x - 0.03, 0.87, front], s.material('#8b6b2c', { metalness: 0.5 }));
      s.cylinder(0.018, 0.018, 0.13, [x - 0.036, 0.95, front], s.material('#3a2a1e'), 8);
      s.ball([0.035, 0.028, 0.03], [x - 0.04, 1.03, front], s.material('#8b6b2c', { metalness: 0.5 }), 8);
      const shield = new Sculpture(context);
      shield.cylinder(0.42, 0.42, 0.035, [0, 0, 0], s.material(['#b3312a', '#2f5d8c', '#d9b441'][Math.floor(random() * 3)]), 22).rotation.x = Math.PI / 2;
      shield.ball([0.09, 0.09, 0.07], [0, 0, 0.03], steel, 10);
      shield.ring(0.42, 0.018, [0, 0, 0], s.material('#5a4630'));
      shield.root.position.set(side * W * 0.3, 0.45, fallen ? front : T * 0.5 + 0.2);
      shield.root.rotation.x = -0.35;
      s.root.add(shield.root);
    }
    if (a.offering === 'cairn') {
      for (let i = 0; i < 14; i++) {
        const layer = i < 7 ? 0 : i < 12 ? 1 : 2, angle = random() * 6.3, r = (0.2 - layer * 0.07) * random() * 1.4;
        s.ball([0.08, 0.055, 0.07], [W * 0.3 + Math.cos(angle) * r, 0.16 + layer * 0.085, front + Math.sin(angle) * r], s.material([base, speck, light][i % 3]), 7).rotation.y = angle;
      }
    }
    if (a.offering === 'tools') {
      s.box([0.11, 0.1, 0.18], [-W * 0.25, 0.2, front], s.material('#a88a61')).rotation.y = 0.5;
      s.rod([-W * 0.25, 0.2, front], [-W * 0.25 + 0.26, 0.19, front + 0.15], 0.018, s.material('#8f744f'));
      s.rod([W * 0.1, 0.17, front + 0.1], [W * 0.1 + 0.24, 0.17, front - 0.02], 0.012, s.material('#55585c', { metalness: 0.6 }));
      const chips = Array.from({ length: 40 }, () => ({ at: [(random() - 0.5) * W * 1.3, 0.14, front - 0.25 + random() * 0.5] as [number, number, number], size: 0.015 + random() * 0.03, color: light }));
      s.scatter(new THREE.TetrahedronGeometry(1), s.material('#ffffff'), chips);
    }

    return s.finish({ footprint: moundR });
  },
});
