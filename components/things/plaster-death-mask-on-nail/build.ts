import * as THREE from 'three';
import { Sculpture, choice, clamp01, defineThing, mix } from '@conjure/kit';

type V3 = [number, number, number];
const W = 0.082, HH = 0.118;

interface Face { jaw: number; chin: number; nose: number; socket: number; brow: number; cheek: number; hollow: number; lips: number; beard: number; hair: number; scale: number }
const FACES: Record<'oldman' | 'woman' | 'child' | 'poet', Face> = {
  oldman: { jaw: 0.2, chin: 1.08, nose: 1.3, socket: 1.5, brow: 1.3, cheek: 0.8, hollow: 1.5, lips: 0.55, beard: 0, hair: 0, scale: 1 },
  woman: { jaw: 0.36, chin: 1, nose: 0.8, socket: 0.8, brow: 0.5, cheek: 1.15, hollow: 0, lips: 1.2, beard: 0, hair: 1, scale: 0.94 },
  child: { jaw: 0.2, chin: 0.84, nose: 0.5, socket: 0.55, brow: 0.25, cheek: 1.7, hollow: -0.6, lips: 0.95, beard: 0, hair: 0, scale: 0.76 },
  poet: { jaw: 0.06, chin: 1.22, nose: 1.15, socket: 1.25, brow: 1.4, cheek: 0.8, hollow: 0.5, lips: 0.8, beard: 1, hair: 0.35, scale: 1.05 },
};
const NAMES = { oldman: 'M. AUBRY 1871', woman: 'INCONNUE', child: 'ANNA 1889', poet: 'POETA 1837' } as const;

function paint(width: number, height: number, draw: (ctx: CanvasRenderingContext2D) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = width; canvas.height = height;
  draw(canvas.getContext('2d')!);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}
const rgba = (colour: string, alpha: number) => { const c = new THREE.Color(colour); return `rgba(${Math.round(c.r * 255)},${Math.round(c.g * 255)},${Math.round(c.b * 255)},${alpha})`; };
const gauss = (x: number, y: number, cx: number, cy: number, sx: number, sy: number) => Math.exp(-(((x - cx) / sx) ** 2) - (((y - cy) / sy) ** 2));
const smooth = (a: number, b: number, v: number) => { const t = clamp01((v - a) / (b - a)); return t * t * (3 - 2 * t); };

export default defineThing({
  questions: {
    whose: choice('Whose face was cast?', {
      oldman: 'An old man: hollow cheeks, a big nose, sunken eyes and a lined forehead.',
      woman: 'A young woman who drowned: smooth, hair parted in the middle, almost asleep.',
      child: 'A child: small, round-cheeked and unbearably calm.',
      poet: 'A bearded poet: heavy brow, long face, the beard cast in clotted plaster.',
    }),
    expression: choice('What expression did death leave?', {
      peace: 'Peace: everything let go, the mouth level.',
      smile: 'A faint smile, as if at a private joke.',
      strain: 'Strain: brows knotted, the corners of the mouth pulled down.',
    }),
    material: choice('What is the mask made of?', {
      plaster: 'Raw chalk-white plaster, straight from the mould.',
      bronze: 'Dark bronze, rubbed bright on the nose and brow, green in the hollows.',
      wax: 'Tinted wax with real lashes and brows set in, far too lifelike.',
    }),
    state: choice('What state is it in?', {
      clean: 'Clean and cared for.',
      cracked: 'Cracked across the brow, the upper piece slipped a little.',
      dusty: 'Grey with dust on every upward surface, forgotten.',
      garlanded: 'Garlanded: a wreath of leaves and small flowers laid round the brow.',
    }),
    display: choice('How is it kept?', {
      nail: 'Hung by a wire from a nail on a patch of wall above a narrow shelf.',
      cushion: 'Laid on a tasselled velvet cushion on a sloped stand.',
      dome: 'Upright on a brass rod under a glass dome.',
      newspaper: 'Half unwrapped from old newspaper, as it came out of a trunk.',
    }),
    label: choice('How is it identified?', {
      none: 'It is not: nobody wrote the name down.',
      tag: 'A paper luggage tag on a string with a name in ink.',
      plate: 'A small engraved brass plate.',
      number: 'An inventory number inked on the forehead and a matching card.',
    }),
    beside: choice('What has been left beside it?', {
      nothing: 'Nothing.',
      rose: 'A single dried rose.',
      tools: 'The caster\'s bowl of set plaster and a spatula: it was made today.',
      candle: 'A candle stub burning in a saucer.',
      spectacles: 'A pair of wire spectacles that were theirs.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const f = FACES[a.whose];
    const smile = { peace: 0.1, smile: 1, strain: -0.9 }[a.expression];
    const strain = a.expression === 'strain' ? 1 : 0;
    const ph = random() * 6, asym = (random() - 0.5) * 0.08;
    const noise = (x: number, y: number) => 0.5 + 0.5 * Math.sin(x * 1.3 + ph) * Math.sin(y * 1.7 + ph * 2.1);
    const cracked = a.state === 'cracked';
    const slope = (random() - 0.5) * 0.3;
    const crackY = (nx: number) => 0.52 + slope * nx + 0.035 * Math.sin(nx * 8 + ph);
    const mouthY = (nx: number) => -0.47 + smile * 0.62 * nx * nx + asym * nx;

    const relief = (nx: number, ny: number, r: number) => {
      const ax = Math.abs(nx);
      let z = 0.068 * Math.pow(Math.max(0, 1 - r * r), 0.46);
      const full = 0.007 + 0.027 * f.nose;
      const ridge = ny > 0.3 ? 0.007 * Math.exp(-(((ny - 0.3) / 0.16) ** 2))
        : ny > -0.2 ? 0.007 + 0.027 * f.nose * Math.pow((0.3 - ny) / 0.5, 1.3)
          : full * Math.exp(-(((ny + 0.2) / 0.05) ** 2));
      z += ridge * Math.exp(-((nx / (0.075 + 0.085 * clamp01((0.3 - ny) / 0.5))) ** 2));
      z += 0.007 * f.nose * gauss(ax, ny, 0.15, -0.19, 0.07, 0.055);
      z -= 0.011 * f.socket * gauss(ax, ny, 0.4, 0.21, 0.2, 0.11);
      z += 0.0078 * gauss(ax, ny, 0.4, 0.19, 0.15, 0.07);
      z += 0.006 * f.brow * gauss(ax, ny, 0.4, 0.37 - strain * 0.02, 0.26, 0.065);
      z += 0.005 * strain * gauss(ax, ny, 0.13, 0.37, 0.07, 0.08);
      z += 0.006 * f.cheek * gauss(ax, ny, 0.56, -0.04 + Math.max(0, smile) * 0.05, 0.22, 0.16);
      z -= 0.008 * f.hollow * gauss(ax, ny, 0.5, -0.36, 0.2, 0.2);
      const ym = mouthY(nx);
      z += 0.007 * gauss(nx, ny, 0, -0.45, 0.36, 0.17);
      z += 0.005 * f.lips * Math.exp(-((nx / 0.25) ** 2) - (((ny - ym - 0.04) / 0.035) ** 2));
      z += 0.006 * f.lips * Math.exp(-((nx / 0.2) ** 2) - (((ny - ym + 0.045) / 0.04) ** 2));
      z -= 0.0045 * Math.exp(-((nx / 0.3) ** 2) - (((ny - ym) / 0.014) ** 2));
      z += 0.008 * gauss(nx, ny, 0, -0.78, 0.26, 0.13);
      if (f.beard) {
        const lipsClear = 1 - 0.85 * gauss(nx, ny, 0, -0.47, 0.2, 0.07);
        const body = smooth(-0.3, -0.5, ny + ax * 0.1) * lipsClear;
        const moustache = gauss(ax, ny, 0.17, -0.36, 0.17, 0.05);
        z += f.beard * (0.013 * body + 0.008 * moustache) * (0.65 + 0.7 * noise(nx * 12, ny * 12));
      }
      if (f.hair) z += f.hair * smooth(0.56, 0.74, ny + ax * 0.4) * (0.006 + 0.003 * Math.sin(ax * 12 + ny * 6));
      if (cracked && ny > crackY(nx)) z -= 0.005;
      return z;
    };

    // The cast itself: a polar grid pushed out into a face, with a skirt down to the back plane.
    const R = 60, S = 128;
    const pos: number[] = [0, 0, relief(0, 0, 0)], uv: number[] = [0.5, 0.5], idx: number[] = [];
    for (let i = 1; i <= R + 1; i++) for (let j = 0; j < S; j++) {
      const skirt = i === R + 1, r = skirt ? 1 : i / R, t = (j / S) * Math.PI * 2;
      const sn = Math.sin(t), nx = r * Math.cos(t) * (sn < 0 ? 1 - f.jaw * sn * sn : 1), ny = r * sn;
      const lift = cracked && ny > crackY(nx) ? 0.004 : 0;
      pos.push(nx * W + lift, ny * HH * (ny < 0 ? f.chin : 1) + lift * 0.6, skirt ? -0.014 : relief(nx, ny, r));
      uv.push(nx * 0.5 + 0.5, ny * 0.5 + 0.5);
    }
    for (let j = 0; j < S; j++) idx.push(0, 1 + j, 1 + ((j + 1) % S));
    for (let i = 1; i <= R; i++) for (let j = 0; j < S; j++) {
      const p = 1 + (i - 1) * S + j, q = 1 + (i - 1) * S + ((j + 1) % S), c = p + S, d = q + S;
      idx.push(p, c, d, p, d, q);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    geo.setIndex(idx);
    geo.computeVertexNormals();

    const pal = {
      plaster: { base: '#ece7d9', mottle: '#cfc8b4', shade: '#8f8672', line: '#756c5a', high: '#ffffff' },
      bronze: { base: '#6a5132', mottle: '#4f3d28', shade: '#3f7f68', line: '#201a12', high: '#e0b467' },
      wax: { base: '#e9c99c', mottle: '#dcb486', shade: '#a8693f', line: '#4a2f20', high: '#fff0d2' },
    }[a.material];
    const wear = mood.wear;
    const skin = paint(512, 512, (ctx) => {
      const N = 512, X = (nx: number) => (nx * 0.5 + 0.5) * N, Y = (ny: number) => (0.5 - ny * 0.5) * N;
      const blob = (nx: number, ny: number, rx: number, ry: number, colour: string, alpha: number) => {
        ctx.save(); ctx.translate(X(nx), Y(ny)); ctx.scale(rx * N / 2, ry * N / 2);
        const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
        g.addColorStop(0, rgba(colour, clamp01(alpha))); g.addColorStop(1, rgba(colour, 0));
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, 1, 0, 7); ctx.fill(); ctx.restore();
      };
      const curve = (points: (t: number) => [number, number], width: number, colour: string, alpha = 1, steps = 24) => {
        ctx.strokeStyle = rgba(colour, alpha); ctx.lineWidth = width; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        ctx.beginPath();
        for (let k = 0; k <= steps; k++) { const [nx, ny] = points(k / steps); if (k) ctx.lineTo(X(nx), Y(ny)); else ctx.moveTo(X(nx), Y(ny)); }
        ctx.stroke();
      };
      ctx.fillStyle = pal.base; ctx.fillRect(0, 0, N, N);
      for (let i = 0; i < 240; i++) blob(random() * 2 - 1, random() * 2 - 1, 0.04 + random() * 0.12, 0.04 + random() * 0.12, random() < 0.5 ? pal.mottle : pal.high, 0.1);
      // Hollows read darker (or greener, in bronze); ridges catch the light.
      for (const sx of [-1, 1]) {
        blob(sx * 0.4, 0.25, 0.27, 0.13, pal.shade, 0.3 + 0.2 * f.socket);
        blob(sx * 0.21, -0.02, 0.09, 0.26, pal.shade, 0.32);
        blob(sx * 0.5, -0.36, 0.22, 0.22, pal.shade, 0.3 * Math.max(0, f.hollow));
        blob(sx * 0.4, 0.37, 0.24, 0.05, pal.high, a.material === 'bronze' ? 0.6 : 0.3);
        blob(sx * 0.56, -0.04, 0.16, 0.1, pal.high, a.material === 'bronze' ? 0.45 : 0.2);
      }
      blob(0, -0.275, 0.2, 0.05, pal.shade, 0.55);
      blob(0, mouthY(0) - 0.15, 0.2, 0.05, pal.shade, 0.45);
      blob(0, -0.06, 0.06, 0.22, pal.high, a.material === 'bronze' ? 0.75 : 0.3);
      blob(0, -0.78, 0.16, 0.08, pal.high, a.material === 'bronze' ? 0.5 : 0.2);
      if (a.material === 'wax') {
        blob(0, mouthY(0), 0.24, 0.085, '#b4574f', 0.6);
        for (const sx of [-1, 1]) { blob(sx * 0.4, 0.2, 0.15, 0.07, '#a0708a', 0.35); blob(sx * 0.55, -0.1, 0.2, 0.16, '#d98a78', 0.2); }
      }
      if (f.hair) for (let i = 0; i < 46; i++) { const sx = i % 2 ? 1 : -1, o = random(); curve((t) => [sx * (0.03 + t * (0.5 + o * 0.5)), 0.97 - o * 0.2 - t * (0.12 + o * 0.25) + 0.03 * Math.sin(t * 9 + i)], 2, pal.line, a.material === 'wax' ? 0.75 : 0.3, 12); }
      if (f.beard) for (let i = 0; i < 260; i++) {
        const nx = (random() * 2 - 1) * 0.8, ny = -0.32 - random() * 0.66;
        if (gauss(nx, ny, 0, -0.47, 0.2, 0.06) > 0.4) continue;
        const turn = random() * 6;
        curve((t) => [nx + Math.cos(turn + t * 3) * 0.035, ny + Math.sin(turn + t * 3) * 0.035], 2, pal.line, a.material === 'wax' ? 0.7 : 0.34, 6);
      }
      // Closed lids, lashes, brows.
      for (const sx of [-1, 1]) {
        curve((t) => [sx * (0.23 + 0.34 * t), 0.175 - 0.045 * Math.sin(t * Math.PI) - strain * 0.02 * t], 4, pal.line, 0.95);
        curve((t) => [sx * (0.25 + 0.3 * t), 0.24 + 0.03 * Math.sin(t * Math.PI)], 2, pal.line, 0.35);
        if (a.material === 'wax') {
          for (let k = 0; k < 13; k++) { const t = (k + 0.5) / 13, x0 = sx * (0.23 + 0.34 * t), y0 = 0.175 - 0.045 * Math.sin(t * Math.PI); curve((u) => [x0 + sx * u * 0.03 * (t - 0.3), y0 - u * 0.055], 2.2, '#20140e', 1, 2); }
          for (let k = 0; k < 26; k++) { const t = k / 25; curve((u) => [sx * (0.17 + 0.42 * t + u * 0.04), 0.37 + 0.04 * Math.sin(t * 2.6) - strain * 0.05 * (1 - t) + u * 0.03], 2.4, '#3a2518', 0.85, 2); }
        } else curve((t) => [sx * (0.17 + 0.44 * t), 0.4 + 0.035 * Math.sin(t * 2.6) - strain * 0.05 * (1 - t)], 3, pal.line, 0.3);
        if (strain) curve((t) => [sx * (0.06 + 0.02 * t), 0.3 + 0.16 * t], 3, pal.line, 0.7, 4);
        ctx.fillStyle = rgba(pal.line, 0.85); ctx.beginPath(); ctx.ellipse(X(sx * 0.1), Y(-0.245), 9, 5, sx * 0.4, 0, 7); ctx.fill();
        if (a.whose === 'oldman' || strain) curve((t) => [sx * (0.2 + 0.2 * t), -0.2 - 0.34 * t + 0.03 * Math.sin(t * 3)], 3, pal.line, 0.5);
      }
      curve((t) => { const nx = -0.31 + 0.62 * t; return [nx, mouthY(nx)]; }, 4, pal.line, 0.95);
      if (a.whose === 'oldman') for (let k = 0; k < 4; k++) curve((t) => [-0.55 + 1.1 * t, 0.56 + k * 0.08 + 0.015 * Math.sin(t * 7 + k)], 2, pal.line, 0.42);
      // The mould seam: a raised flash down the midline, skipping the features.
      for (const [from, to] of [[0.98, 0.42], [-0.62, -1]] as const) {
        curve((t) => [0.025 + 0.008 * Math.sin(t * 20), from + (to - from) * t], 3, pal.high, 0.9);
        curve((t) => [0.045 + 0.008 * Math.sin(t * 20), from + (to - from) * t], 2, pal.line, 0.55);
      }
      for (let k = 0; k < 7; k++) blob(0.03 + (random() - 0.5) * 0.03, random() < 0.6 ? 0.45 + random() * 0.5 : -0.65 - random() * 0.3, 0.02, 0.02, pal.high, 0.9);
      if (cracked) {
        curve((t) => { const nx = -1 + 2 * t; return [nx, crackY(nx) + 0.012 * Math.sin(t * 60)]; }, 5, '#1d1a15', 1, 60);
        curve((t) => { const nx = -1 + 2 * t; return [nx, crackY(nx) + 0.028]; }, 2, pal.high, 0.7, 40);
        for (let k = 0; k < 4; k++) { const nx = (random() * 2 - 1) * 0.7, len = 0.12 + random() * 0.25, lean = (random() - 0.5) * 0.3; curve((t) => [nx + lean * t + 0.02 * Math.sin(t * 14), crackY(nx) - len * t], 2.5, '#1d1a15', 0.85, 10); }
      }
      if (a.state === 'dusty') {
        for (const [nx, ny, rx, ry] of [[0, 0.7, 0.7, 0.26], [-0.4, 0.4, 0.26, 0.07], [0.4, 0.4, 0.26, 0.07], [0, 0.02, 0.07, 0.2], [-0.55, 0.02, 0.2, 0.1], [0.55, 0.02, 0.2, 0.1], [0, -0.42, 0.22, 0.05], [0, -0.74, 0.2, 0.08]] as const) blob(nx, ny, rx, ry, '#6f6b62', 0.8);
        for (let i = 0; i < 900; i++) { ctx.fillStyle = rgba('#5d5a52', 0.25 + random() * 0.3); ctx.fillRect(random() * N, random() * N, 2, 2); }
      }
      for (let i = 0; i < wear * 26; i++) blob(random() * 2 - 1, random() * 2 - 1, 0.03 + random() * 0.1, 0.03 + random() * 0.14, a.material === 'bronze' ? '#4f9a80' : '#7a5a34', 0.3);
      if (a.label === 'number') { ctx.fillStyle = a.material === 'bronze' ? '#f1e6c2' : '#1d1a15'; ctx.font = 'bold 26px monospace'; ctx.textAlign = 'center'; ctx.fillText('N.214', X(-0.36), Y(0.66)); }
    });
    const cast = new THREE.MeshStandardMaterial({
      map: skin, side: THREE.DoubleSide,
      roughness: a.material === 'plaster' ? 0.95 : a.material === 'bronze' ? 0.42 : 0.36,
      metalness: a.material === 'bronze' ? 0.65 : 0,
      emissive: a.material === 'wax' ? '#5a2d14' : '#000000', emissiveIntensity: a.material === 'wax' ? 0.25 : 0,
    });
    const mask = new THREE.Group();
    const faceMesh = new THREE.Mesh(geo, cast);
    faceMesh.castShadow = faceMesh.receiveShadow = true;
    mask.add(faceMesh);
    mask.scale.setScalar(f.scale);

    if (a.state === 'garlanded') {
      const dried = wear > 0.55;
      const leafM = new THREE.MeshStandardMaterial({ color: dried ? '#7d6a3a' : '#4f7a3c', roughness: 0.7 });
      const petalM = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.6 });
      const count = 54, blooms = 13;
      const leaves = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 8, 6), leafM, count);
      const flowers = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 1), petalM, blooms);
      const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
      const spot = (t: number): V3 => {
        const ang = mix(-0.12, Math.PI + 0.12, t), nx = 0.86 * Math.cos(ang), ny = 0.3 + 0.36 * Math.sin(ang);
        return [nx * W, ny * HH, relief(nx, ny, Math.min(0.99, Math.hypot(nx, ny))) + 0.004];
      };
      for (let k = 0; k < count; k++) {
        const [x, y, z] = spot(k / (count - 1));
        q.setFromEuler(e.set(random() * 0.8 - 0.4, random() * 0.8 - 0.4, random() * 6));
        m.compose(new THREE.Vector3(x + (random() - 0.5) * 0.012, y + (random() - 0.5) * 0.016, z + random() * 0.006), q, new THREE.Vector3(0.016 + random() * 0.006, 0.007, 0.003));
        leaves.setMatrixAt(k, m);
      }
      const hues = mood.cheer > 0.6 ? ['#f2c230', '#e85a7a', '#ffffff', '#f08a2c'] : mood.cheer > 0.3 ? ['#f1ead2', '#e6b4c0', '#cfc4e6'] : ['#f1ead2', '#d9d2c0'];
      for (let k = 0; k < blooms; k++) {
        const [x, y, z] = spot((k + 0.5) / blooms);
        m.compose(new THREE.Vector3(x, y + (random() - 0.5) * 0.01, z + 0.007), q.identity(), new THREE.Vector3().setScalar(0.007 + random() * 0.004));
        flowers.setMatrixAt(k, m);
        flowers.setColorAt(k, new THREE.Color(dried ? '#b89a6a' : hues[k % hues.length]));
      }
      leaves.castShadow = flowers.castShadow = true;
      mask.add(leaves, flowers);
    }

    const warm = mood.warmth > 0.5;
    const wood = s.material('#5a3f2c', { roughness: 0.75 });
    const brass = s.material('#b8934a', { metalness: 0.75, roughness: 0.35 });
    const iron = s.material('#2e2a27', { metalness: 0.5, roughness: 0.6 });
    const faceH = HH * (1 + f.chin) * f.scale, faceMid = (HH * (1 - f.chin) * f.scale) / 2;
    /** Where the label and the keepsake go for each display: x, y, z. */
    let labelAt: V3 = [0.15, 0, 0.17], besideAt: V3 = [-0.17, 0, 0.17], tagFrom: V3 = [0.06, 0.2, 0.05];

    if (a.display === 'nail') {
      const wallTex = paint(256, 320, (ctx) => {
        ctx.fillStyle = warm ? '#7a4a3c' : '#4d6158'; ctx.fillRect(0, 0, 256, 320);
        ctx.strokeStyle = warm ? 'rgba(214,170,96,0.4)' : 'rgba(210,220,200,0.3)'; ctx.lineWidth = 3;
        for (let x = 16; x < 256; x += 32) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 320); ctx.stroke(); }
        for (let i = 0; i < 12 + wear * 50; i++) { ctx.fillStyle = `rgba(30,25,20,${0.08 + random() * 0.12})`; ctx.beginPath(); ctx.ellipse(random() * 256, random() * 320, 6 + random() * 30, 6 + random() * 40, 0, 0, 7); ctx.fill(); }
        // The paler patch where it has always hung.
        ctx.fillStyle = 'rgba(255,245,220,0.12)'; ctx.beginPath(); ctx.ellipse(128, 150, 80, 108, 0, 0, 7); ctx.fill();
      });
      s.box([0.3, 0.4, 0.03], [0, 0.23, -0.03], new THREE.MeshStandardMaterial({ map: wallTex, roughness: 0.9 }));
      s.box([0.36, 0.03, 0.18], [0, 0.015, 0.03], wood);
      s.box([0.32, 0.04, 0.03], [0, 0.05, -0.03], wood);
      for (const x of [-1, 1]) s.box([0.03, 0.09, 0.14], [x * 0.13, -0.045, 0.02], wood);
      const cy = 0.245 - faceMid;
      mask.position.set(0, cy, 0.0);
      mask.rotation.set(0.07, 0, (random() - 0.5) * 0.12);
      const top = cy + HH * f.scale;
      s.rod([0, top + 0.05, -0.015], [0, top + 0.052, 0.012], 0.004, iron);
      s.cylinder(0.008, 0.008, 0.003, [0, top + 0.052, 0.013], iron, 10).rotation.x = Math.PI / 2;
      for (const x of [-1, 1]) s.rod([0, top + 0.05, 0.006], [x * 0.045 * f.scale, top - 0.03, 0.004], 0.0016, brass);
      labelAt = [0.1, 0.03, 0.09]; besideAt = [-0.09, 0.03, 0.075]; tagFrom = [0, top + 0.05, 0.01];
      s.root.add(mask);
    } else if (a.display === 'cushion' || a.display === 'newspaper') {
      const tilt = a.display === 'cushion' ? 0.5 : 0.5;
      const bed = new THREE.Group();
      bed.rotation.x = -(Math.PI / 2 - tilt);
      bed.rotation.z = (random() - 0.5) * 0.1;
      mask.position.set(0, -faceMid, a.display === 'cushion' ? 0.04 : 0.03);
      mask.rotation.z = (random() - 0.5) * 0.3;
      bed.add(mask);
      const lift = (mesh: THREE.Mesh) => { mesh.castShadow = mesh.receiveShadow = true; bed.add(mesh); return mesh; };
      if (a.display === 'cushion') {
        const velvet = s.material(warm ? '#7c1f2e' : '#263a6a', { roughness: 0.95 });
        const pillow = new THREE.BoxGeometry(0.25, 0.3, 0.1, 14, 14, 2);
        const p = pillow.attributes.position as THREE.BufferAttribute;
        for (let i = 0; i < p.count; i++) {
          const x = p.getX(i) / 0.125, y = p.getY(i) / 0.15;
          const puff = (1 - 0.95 * x ** 4) * (1 - 0.95 * y ** 4);
          p.setZ(i, p.getZ(i) * (0.12 + 0.88 * puff) - 0.012 * gauss(x, y, 0, 0, 0.6, 0.7));
        }
        pillow.computeVertexNormals();
        lift(new THREE.Mesh(pillow, velvet));
        for (const x of [-1, 1]) for (const y of [-1, 1]) {
          const tassel = lift(new THREE.Mesh(new THREE.ConeGeometry(0.012, 0.045, 8), brass));
          tassel.position.set(x * 0.135, y * 0.16, 0); tassel.rotation.z = -x * (y > 0 ? 0.8 : 2.3);
        }
        lift(new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.35, 0.018), wood)).position.z = -0.045;
        lift(new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.02, 0.05), wood)).position.set(0, -0.175, -0.02);
        bed.position.set(0, 0.135, 0);
        for (const x of [-1, 1]) s.rod([x * 0.11, 0.17, -0.16], [x * 0.11, 0, -0.2], 0.012, wood);
        s.box([0.3, 0.02, 0.05], [0, 0.01, 0.17], wood);
        labelAt = [0.1, 0, 0.26]; besideAt = [-0.24, 0, 0.14]; tagFrom = [0.12, 0.08, 0.14];
      } else {
        const news = paint(512, 384, (ctx) => {
          ctx.fillStyle = mix(0, 1, wear) > 0.5 ? '#cdbf98' : '#ddd5bd'; ctx.fillRect(0, 0, 512, 384);
          ctx.fillStyle = '#2a2824'; ctx.fillRect(20, 16, 472, 26); ctx.fillStyle = '#ddd5bd'; ctx.font = 'bold 22px serif'; ctx.fillText('THE  EVENING  COURIER', 110, 37);
          ctx.fillStyle = '#3a3731'; ctx.fillRect(20, 54, 300, 16); ctx.fillRect(20, 76, 220, 10);
          ctx.fillStyle = '#6f6a5e'; ctx.fillRect(340, 54, 152, 110);
          for (let col = 0; col < 4; col++) for (let row = 0; row < 44; row++) {
            if (col === 3 && row < 12) continue;
            ctx.fillStyle = `rgba(50,47,42,${0.45 + random() * 0.3})`; ctx.fillRect(20 + col * 120, 98 + row * 6.3, 60 + random() * 46, 3);
          }
        });
        const paper = new THREE.MeshStandardMaterial({ map: news, roughness: 0.95, side: THREE.DoubleSide });
        const sheet = (w: number, h: number, rough: number) => {
          const g = new THREE.PlaneGeometry(w, h, 12, 10), p = g.attributes.position as THREE.BufferAttribute, o = random() * 9;
          for (let i = 0; i < p.count; i++) p.setZ(i, rough * (Math.sin(p.getX(i) * 31 + o) * Math.sin(p.getY(i) * 37 + o * 2) + 0.6 * Math.sin(p.getX(i) * 67 + p.getY(i) * 53 + o)));
          g.computeVertexNormals();
          return g;
        };
        for (let k = 0; k < 3; k++) {
          const flat = s.mesh(sheet(0.38, 0.28, 0.006), paper, [(random() - 0.5) * 0.1, 0.008 + k * 0.006, (random() - 0.5) * 0.08]);
          flat.rotation.set(-Math.PI / 2, 0, (random() - 0.5) * 1.2);
        }
        const wad = s.mesh(new THREE.IcosahedronGeometry(1, 2), paper, [0, 0.05, -0.05]);
        const wp = wad.geometry.attributes.position as THREE.BufferAttribute;
        for (let i = 0; i < wp.count; i++) { const k = 0.82 + 0.3 * noise(wp.getX(i) * 9 + wp.getZ(i) * 7, wp.getY(i) * 8); wp.setXYZ(i, wp.getX(i) * k, wp.getY(i) * k, wp.getZ(i) * k); }
        wad.geometry.computeVertexNormals();
        wad.scale.set(0.14, 0.06, 0.12);
        // One sheet still folded over the jaw.
        const flap = lift(new THREE.Mesh(sheet(0.2, 0.13, 0.006), paper));
        flap.position.set(-0.06 - random() * 0.03, -faceMid - faceH * 0.62, 0.05);
        flap.rotation.set(0.75, 0.2, 0.45 + random() * 0.3);
        const under = lift(new THREE.Mesh(sheet(0.27, 0.33, 0.007), paper));
        under.position.z = 0.012; under.rotation.z = 0.3;
        const twine = s.material('#a58a5a', { roughness: 1 });
        s.tube([[0.2, 0.012, 0.1], [0.24, 0.012, 0.16], [0.19, 0.012, 0.2], [0.14, 0.012, 0.15], [0.2, 0.014, 0.12], [0.27, 0.012, 0.2]], 0.003, twine);
        bed.position.set(0, 0.12, -0.02);
        labelAt = [0.17, 0, 0.26]; besideAt = [-0.24, 0, 0.2]; tagFrom = [0.1, 0.1, 0.12];
      }
      s.root.add(bed);
    } else {
      s.lathe([[0, 0], [0.15, 0], [0.155, 0.012], [0.142, 0.03], [0.132, 0.036], [0.13, 0.05], [0, 0.05]], wood);
      s.ring(0.122, 0.006, [0, 0.052, 0], brass).rotation.x = Math.PI / 2;
      const cy = 0.05 + 0.045 + faceH / 2 - faceMid;
      s.cylinder(0.035, 0.045, 0.012, [0, 0.056, -0.03], brass, 20);
      s.rod([0, 0.06, -0.03], [0, cy - 0.01, -0.03], 0.005, brass);
      s.rod([0, cy - 0.01, -0.03], [0, cy, -0.012], 0.005, brass);
      mask.position.set(0, cy, 0);
      mask.rotation.set(-0.1, (random() - 0.5) * 0.3, 0);
      s.root.add(mask);
      const tall = cy + HH * f.scale + 0.03 - 0.05;
      const profile: [number, number][] = [[0.118, 0], [0.118, tall - 0.1]];
      for (let k = 1; k <= 10; k++) { const t = (k / 10) * Math.PI / 2; profile.push([0.118 * Math.cos(t), tall - 0.1 + 0.118 * Math.sin(t)]); }
      const glass = new THREE.MeshPhysicalMaterial({ color: '#e8f4f2', transparent: true, opacity: 0.16, roughness: 0.04, depthWrite: false, side: THREE.DoubleSide });
      const dome = s.lathe(profile, glass, [0, 0.052, 0]);
      dome.castShadow = false;
      const glint = new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.4, depthWrite: false, side: THREE.DoubleSide });
      for (const [turn, width] of [[-0.75, 0.014], [-0.6, 0.005]] as const) {
        const streak = s.mesh(new THREE.PlaneGeometry(width, tall * 0.62), glint, [Math.sin(turn) * 0.119, 0.052 + tall * 0.42, Math.cos(turn) * 0.119]);
        streak.rotation.y = turn; streak.castShadow = false;
      }
      s.ball([0.016, 0.016, 0.016], [0, 0.052 + tall + 0.03, 0], s.material('#dfeeee', { roughness: 0.1 }), 12);
      if (cracked && wear > 0.4) { const split = s.mesh(new THREE.PlaneGeometry(0.004, tall * 0.5), new THREE.MeshBasicMaterial({ color: '#f5ffff', transparent: true, opacity: 0.7, depthWrite: false, side: THREE.DoubleSide }), [0.076, 0.2, 0.091]); split.rotation.set(0, 0.7, 0.3); }
      labelAt = [0.14, 0, 0.17]; besideAt = [-0.2, 0, 0.13]; tagFrom = [0.1, 0.05, 0.08];
    }

    // How it is identified.
    const name = NAMES[a.whose];
    if (a.label === 'plate') {
      const plate = s.label(name, 0.13, 0.034, [labelAt[0] - 0.13 * (a.display === 'nail' ? 1 : 0), labelAt[1] + (a.display === 'nail' ? 0.035 : 0.02), a.display === 'nail' ? -0.012 : labelAt[2]], '#2a2010', '#c9a44e');
      if (a.display !== 'nail') plate.rotation.x = -0.6;
      (plate.material as THREE.MeshStandardMaterial).metalness = 0.5;
    } else if (a.label === 'tag' || a.label === 'number') {
      const text = a.label === 'tag' ? name : 'N.214';
      const card = s.label(text, a.label === 'tag' ? 0.12 : 0.08, 0.045, [labelAt[0], labelAt[1] + 0.004, labelAt[2]], '#2a2420', a.label === 'tag' ? '#d8c08a' : '#f1ead2');
      card.rotation.set(-Math.PI / 2, 0, (random() - 0.5) * 0.9);
      if (a.label === 'tag') s.tube([tagFrom, [mix(tagFrom[0], labelAt[0], 0.5), Math.max(labelAt[1] + 0.01, tagFrom[1] * 0.35), mix(tagFrom[2], labelAt[2], 0.6)], [labelAt[0] - 0.05, labelAt[1] + 0.006, labelAt[2]]], 0.0015, s.material('#8a6a44'));
    }

    // What was left beside it.
    let flame: THREE.Mesh | null = null;
    const [bx, by, bz] = besideAt;
    if (a.beside === 'rose') {
      const stem = s.material('#5d5a34'), petal = s.material(wear > 0.5 ? '#5a2a22' : '#8a2a32', { roughness: 0.8 });
      s.rod([bx - 0.09, by + 0.006, bz + 0.03], [bx + 0.06, by + 0.012, bz - 0.02], 0.003, stem);
      s.ball([0.02, 0.018, 0.02], [bx + 0.07, by + 0.018, bz - 0.024], petal, 10);
      s.ball([0.013, 0.02, 0.013], [bx + 0.078, by + 0.022, bz - 0.027], s.material('#6a1f28'), 8);
      for (const [o, side] of [[0.3, 1], [0.6, -1]] as const) s.ball([0.02, 0.003, 0.009], [mix(bx - 0.09, bx + 0.06, o), by + 0.01, mix(bz + 0.03, bz - 0.02, o) + side * 0.012], stem, 8).rotation.y = side * 0.8;
    } else if (a.beside === 'tools') {
      const enamel = s.material('#c9d2d0', { roughness: 0.4, side: THREE.DoubleSide });
      s.lathe([[0, 0.004], [0.04, 0.004], [0.062, 0.045], [0.066, 0.047]], enamel, [bx, by, bz]);
      s.cylinder(0.056, 0.045, 0.012, [bx, by + 0.034, bz], s.material('#f1ede0', { roughness: 1 }), 20);
      s.rod([bx + 0.02, by + 0.04, bz], [bx + 0.1, by + 0.085, bz + 0.03], 0.004, wood);
      s.box([0.02, 0.003, 0.05], [bx + 0.012, by + 0.042, bz - 0.003], s.material('#a9b0b0', { metalness: 0.7, roughness: 0.3 })).rotation.y = 1.2;
      for (let k = 0; k < 6; k++) s.ball([0.008 + random() * 0.01, 0.003, 0.008 + random() * 0.01], [bx + (random() - 0.5) * 0.2, by + 0.003, bz + 0.05 + random() * 0.07], s.material('#f1ede0', { roughness: 1 }), 8);
    } else if (a.beside === 'candle') {
      s.lathe([[0, 0.003], [0.035, 0.003], [0.05, 0.012], [0.052, 0.014]], s.material('#d9d6c8', { roughness: 0.4, side: THREE.DoubleSide }), [bx, by, bz]);
      const stub = 0.03 + random() * 0.04;
      s.cylinder(0.014, 0.016, stub, [bx, by + 0.004 + stub / 2, bz], s.material('#efe3c2', { roughness: 0.5, emissive: '#6a4a1a', emissiveIntensity: 0.4 }), 14);
      s.ball([0.026, 0.004, 0.024], [bx + 0.004, by + 0.006, bz + 0.004], s.material('#efe3c2', { roughness: 0.5 }), 10);
      flame = s.ball([0.006, 0.014, 0.006], [bx, by + 0.004 + stub + 0.016, bz], new THREE.MeshStandardMaterial({ color: '#ffd27a', emissive: '#ffb030', emissiveIntensity: 2.2 }), 10);
      flame.castShadow = false;
    } else if (a.beside === 'spectacles') {
      const wire = s.material('#c9b27a', { metalness: 0.8, roughness: 0.3 });
      const turn = (random() - 0.5) * 0.8;
      const specs = new Sculpture(context);
      for (const x of [-1, 1]) {
        specs.ring(0.022, 0.0018, [x * 0.028, 0.004, 0], wire).rotation.x = Math.PI / 2;
        specs.cylinder(0.021, 0.021, 0.001, [x * 0.028, 0.004, 0], new THREE.MeshStandardMaterial({ color: '#dff2f2', transparent: true, opacity: 0.3, depthWrite: false }), 16).castShadow = false;
        specs.rod([x * 0.05, 0.004, 0], [x * 0.062, 0.004, -0.085], 0.0014, wire);
      }
      specs.tube([[-0.007, 0.004, 0], [0, 0.009, 0.002], [0.007, 0.004, 0]], 0.0016, wire);
      specs.root.position.set(bx, by, bz); specs.root.rotation.y = turn;
      s.root.add(specs.root);
    }

    const speed = mix(5, 20, mood.energy), sway = mix(0.004, 0.03, mood.energy);
    const hung = a.display === 'nail', rest = mask.rotation.z;
    return s.finish({
      update: (_dt, time) => {
        if (flame) { flame.scale.y = 0.014 * (1 + 0.25 * Math.sin(time * speed) * Math.sin(time * speed * 0.37)); flame.position.x = bx + 0.0015 * Math.sin(time * speed * 0.6); }
        if (hung) mask.rotation.z = rest + sway * Math.sin(time * 1.3);
      },
    });
  },
});
