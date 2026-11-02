import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';

type P = [number, number];
type Tone = 'light' | 'dark' | 'accent';
interface Patch { points: P[]; tone: Tone; group?: string }
type Motif = 'plain' | 'dots' | 'stripes' | 'gingham' | 'plaid' | 'floral' | 'ducks' | 'lace' | 'twill';
type Fabric = readonly [string, Motif, string?];

const ORIGINS = {
  baby: 'Outgrown baby clothes: pastel dots, gingham and nursery prints.',
  work: 'A man\'s work shirts: chambray, pinstripe, buffalo plaid and worn twill.',
  wedding: 'A wedding dress cut up: ivory satin, lace and one piece of pale blue.',
  feedsack: 'Faded feed-sack florals saved through hard years.',
  mourning: 'Dark suits and silk ties: blacks, charcoal stripe, deep purple.',
  scraps: 'Bright scraps of everything, no two patches from the same garment.',
} as const;
const FABRICS: Record<keyof typeof ORIGINS, readonly Fabric[]> = {
  baby: [['#f8eeb0', 'dots', '#ffffff'], ['#f6c4d2', 'gingham', '#ffffff'], ['#bcdcf2', 'dots', '#ffffff'], ['#c9ecd4', 'stripes', '#ffffff'], ['#fbf7ec', 'ducks', '#f2c530'], ['#cdb6ea', 'plain'], ['#f7c69a', 'gingham', '#ffffff'], ['#8fc4e8', 'stripes', '#ffffff']],
  work: [['#5f7fa8', 'plain'], ['#27324f', 'stripes', '#c9d0dc'], ['#a3262b', 'plaid', '#1a1a1a'], ['#6f7377', 'twill', '#55595c'], ['#b89a6a', 'plain'], ['#e8e6dc', 'stripes', '#3d5a8c'], ['#3f5d49', 'plaid', '#1d2a22'], ['#c9d3e0', 'twill', '#aab6c8']],
  wedding: [['#f3ecdd', 'plain'], ['#efe6d2', 'lace', '#ffffff'], ['#cdb27c', 'plain'], ['#9dbfe0', 'plain'], ['#f7f3ea', 'dots', '#d2c6aa'], ['#e3cdb8', 'lace', '#fbf7ef'], ['#b89c6c', 'dots', '#f3ecdd']],
  feedsack: [['#efe3c2', 'floral', '#c4474f'], ['#8fcabf', 'dots', '#f4efe0'], ['#f0d985', 'plaid', '#c98a3a'], ['#e9a3ad', 'floral', '#5f8f4c'], ['#a9cc8e', 'stripes', '#f4efe0'], ['#9fb1dc', 'floral', '#3f5a9a'], ['#c4474f', 'dots', '#efe3c2']],
  mourning: [['#17161a', 'plain'], ['#2f3136', 'stripes', '#8c8f96'], ['#3a1f45', 'plain'], ['#1f2433', 'dots', '#7a7f90'], ['#7c7e83', 'stripes', '#2a2b2e'], ['#5a1a26', 'stripes', '#c9a13c'], ['#a9abb0', 'twill', '#8a8c91'], ['#c9c7c2', 'dots', '#3a3a40']],
  scraps: [['#d8332e', 'dots', '#ffffff'], ['#f2c21d', 'plaid', '#d9541e'], ['#2c7fd1', 'stripes', '#ffffff'], ['#2fa35a', 'floral', '#f4e04d'], ['#e563a5', 'gingham', '#ffffff'], ['#7d4fc9', 'dots', '#f2c21d'], ['#ef7d22', 'plain'], ['#1d3b6e', 'floral', '#f4efe0'], ['#f4efe0', 'floral', '#d8332e'], ['#f7e9a0', 'dots', '#2c7fd1']],
};

function fabricTexture([base, motif, ink = '#ffffff']: Fabric) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 64;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, 64, 64);
  ctx.fillStyle = ctx.strokeStyle = ink;
  if (motif === 'dots') for (const [x, y] of [[16, 16], [48, 48]]) { ctx.beginPath(); ctx.arc(x, y, 7, 0, 7); ctx.fill(); }
  else if (motif === 'stripes') for (let x = 4; x < 64; x += 16) ctx.fillRect(x, 0, 5, 64);
  else if (motif === 'gingham') { ctx.globalAlpha = 0.6; ctx.fillRect(0, 0, 32, 64); ctx.fillRect(0, 0, 64, 32); }
  else if (motif === 'plaid') { ctx.globalAlpha = 0.55; ctx.fillRect(8, 0, 20, 64); ctx.fillRect(0, 8, 64, 20); ctx.globalAlpha = 0.9; ctx.fillRect(44, 0, 3, 64); ctx.fillRect(0, 44, 64, 3); }
  else if (motif === 'floral') for (const [x, y] of [[18, 20], [50, 50]]) {
    for (let p = 0; p < 5; p++) { ctx.beginPath(); ctx.arc(x + Math.cos(p * 1.257) * 8, y + Math.sin(p * 1.257) * 8, 6, 0, 7); ctx.fill(); }
    ctx.save(); ctx.fillStyle = '#e9c24a'; ctx.beginPath(); ctx.arc(x, y, 4.5, 0, 7); ctx.fill(); ctx.restore();
  } else if (motif === 'ducks') for (const [x, y] of [[18, 22], [48, 52]]) {
    ctx.beginPath(); ctx.ellipse(x, y, 10, 7, 0, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.arc(x + 8, y - 8, 5.5, 0, 7); ctx.fill();
    ctx.save(); ctx.fillStyle = '#e8792a'; ctx.fillRect(x + 12, y - 9, 6, 3); ctx.restore();
  } else if (motif === 'lace') { ctx.lineWidth = 2.5; for (const [x, y] of [[0, 0], [32, 32], [64, 0], [0, 64], [64, 64]]) for (const r of [8, 15]) { ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.stroke(); } }
  else if (motif === 'twill') { ctx.lineWidth = 3; for (let i = -64; i < 64; i += 10) { ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i + 64, 64); ctx.stroke(); } }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(24, 24);
  return texture;
}

const rect = (x0: number, y0: number, x1: number, y1: number): P[] => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];

function clip(points: P[], nx: number, ny: number, d: number): P[] {
  const out: P[] = [];
  for (let i = 0; i < points.length; i++) {
    const p = points[i], q = points[(i + 1) % points.length];
    const sp = p[0] * nx + p[1] * ny - d, sq = q[0] * nx + q[1] * ny - d;
    if (sp <= 0) out.push(p);
    if (sp * sq < 0) { const t = sp / (sp - sq); out.push([p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t]); }
  }
  return out;
}
const area = (points: P[]) => Math.abs(points.reduce((sum, p, i) => { const q = points[(i + 1) % points.length]; return sum + p[0] * q[1] - q[0] * p[1]; }, 0)) / 2;
const centroid = (points: P[]): P => [points.reduce((sum, p) => sum + p[0], 0) / points.length, points.reduce((sum, p) => sum + p[1], 0) / points.length];

function layout(pattern: string, random: () => number): Patch[] {
  const out: Patch[] = [];
  if (pattern === 'ninepatch') {
    for (let j = 0; j < 3; j++) for (let i = 0; i < 3; i++) out.push({ points: rect(i / 3, j / 3, (i + 1) / 3, (j + 1) / 3), tone: (i + j) % 2 ? 'light' : 'dark' });
  } else if (pattern === 'logcabin') {
    let x0 = 0.4, y0 = 0.4, x1 = 0.6, y1 = 0.6;
    const w = 0.1;
    out.push({ points: rect(x0, y0, x1, y1), tone: 'accent' });
    for (let round = 0; round < 4; round++) {
      out.push({ points: rect(x1, y0, x1 + w, y1), tone: 'light' }); x1 += w;
      out.push({ points: rect(x0, y1, x1, y1 + w), tone: 'dark' }); y1 += w;
      out.push({ points: rect(x0 - w, y0, x0, y1), tone: 'dark' }); x0 -= w;
      out.push({ points: rect(x0, y0 - w, x1, y0), tone: 'light' }); y0 -= w;
    }
  } else if (pattern === 'star') {
    const t = 1 / 3;
    out.push({ points: rect(t, t, 2 * t, 2 * t), tone: 'accent', group: 'centre' });
    for (const [i, j] of [[1, 0], [2, 1], [1, 2], [0, 1]]) {
      const x = i * t, y = j * t, c: P = [x + t / 2, y + t / 2];
      const corners: P[] = [[x, y], [x + t, y], [x + t, y + t], [x, y + t]];
      for (let k = 0; k < 4; k++) {
        const vertical = k % 2 === 0;
        const starry = i === 1 ? !vertical : vertical;
        out.push({ points: [corners[k], corners[(k + 1) % 4], c], tone: starry ? 'dark' : 'light', group: starry ? 'points' : 'ground' });
      }
    }
    for (const [i, j] of [[0, 0], [2, 0], [2, 2], [0, 2]]) out.push({ points: rect(i * t, j * t, (i + 1) * t, (j + 1) * t), tone: 'light', group: 'ground' });
  } else if (pattern === 'geese') {
    for (let col = 0; col < 2; col++) for (let row = 0; row < 4; row++) {
      const x = col * 0.5, y = row * 0.25, up = col === 0;
      const apex: P = [x + 0.25, up ? y : y + 0.25], base = up ? y + 0.25 : y, far = up ? y : y + 0.25;
      out.push({ points: [[x, base], [x + 0.5, base], apex], tone: 'dark' });
      out.push({ points: [[x, base], apex, [x, far]], tone: 'light', group: 'sky' });
      out.push({ points: [[x + 0.5, base], [x + 0.5, far], apex], tone: 'light', group: 'sky' });
    }
  } else if (pattern === 'pinwheel') {
    const h = 0.25;
    for (const [cx, cy] of [[0.25, 0.25], [0.75, 0.25], [0.75, 0.75], [0.25, 0.75]]) for (let k = 0; k < 4; k++) {
      const turn = ([x, y]: P): P => { let p: P = [x, y]; for (let i = 0; i < k; i++) p = [-p[1], p[0]]; return [cx + p[0], cy + p[1]]; };
      out.push({ points: [turn([0, 0]), turn([-h, 0]), turn([-h, -h])], tone: 'dark', group: `wheel${cx}${cy}` });
      out.push({ points: [turn([0, 0]), turn([-h, -h]), turn([0, -h])], tone: 'light', group: 'ground' });
    }
  } else if (pattern === 'hexflower') {
    const r = 0.1;
    const cells: [number, number, number][] = [[0, 0, 0]];
    for (let q = -2; q <= 2; q++) for (let t = -2; t <= 2; t++) {
      const ring = Math.max(Math.abs(q), Math.abs(t), Math.abs(q + t));
      if (ring >= 1 && ring <= 2) cells.push([q, t, ring]);
    }
    cells.sort((p, q) => p[2] - q[2]);
    for (const [q, t, ring] of cells) {
      const cx = 0.5 + r * Math.sqrt(3) * (q + t / 2), cy = 0.5 + r * 1.5 * t;
      out.push({ points: Array.from({ length: 6 }, (_u, i): P => [cx + Math.cos(Math.PI / 6 + i * Math.PI / 3) * r, cy + Math.sin(Math.PI / 6 + i * Math.PI / 3) * r]), tone: ring === 0 ? 'accent' : ring === 1 ? 'dark' : 'light', group: ring === 1 ? 'petals' : undefined });
    }
  } else if (pattern === 'heart') {
    const w = 0.13;
    out.push({ points: rect(w, w, 1 - w, 1 - w), tone: 'light', group: 'ground' });
    out.push({ points: Array.from({ length: 28 }, (_u, i): P => { const t = i / 28 * Math.PI * 2; return [0.5 + 0.0165 * 16 * Math.sin(t) ** 3, 0.49 - 0.0165 * (13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t))]; }), tone: 'accent' });
    out.push({ points: rect(0, 0, 1 - w, w), tone: 'dark' }, { points: rect(1 - w, 0, 1, 1 - w), tone: 'dark' }, { points: rect(w, 1 - w, 1, 1), tone: 'dark' }, { points: rect(0, w, w, 1), tone: 'dark' });
  } else {
    let pieces: P[][] = [rect(0, 0, 1, 1)];
    for (let i = 0; i < 12; i++) {
      pieces.sort((p, q) => area(q) - area(p));
      const piece = pieces.shift()!, c = centroid(piece), angle = random() * Math.PI;
      const nx = Math.cos(angle), ny = Math.sin(angle), d = nx * (c[0] + (random() - 0.5) * 0.08) + ny * (c[1] + (random() - 0.5) * 0.08);
      const one = clip(piece, nx, ny, d), two = clip(piece, -nx, -ny, -d);
      if (one.length < 3 || two.length < 3) { pieces.push(piece); continue; }
      pieces.push(one, two);
    }
    pieces.sort((p, q) => Math.hypot(centroid(p)[0] - 0.5, centroid(p)[1] - 0.5) - Math.hypot(centroid(q)[0] - 0.5, centroid(q)[1] - 0.5));
    pieces.forEach((points, i) => out.push({ points, tone: (['dark', 'light', 'accent'] as const)[i % 3] }));
  }
  return out;
}

export default defineThing({
  questions: {
    pattern: choice('What pattern is the block?', {
      ninepatch: 'A plain nine-patch chequer, the first block anyone learns.',
      logcabin: 'Log cabin: strips built round a small red hearth square, light on one side and dark on the other.',
      geese: 'Flying geese: rows of triangles all heading one way.',
      pinwheel: 'Pinwheels, four spinning sets of triangles.',
      hexflower: 'A grandmother\'s flower garden rosette of paper-pieced hexagons.',
      crazy: 'A crazy quilt of irregular scraps fitted together however they would go.',
      heart: 'An appliqued heart in a bordered square.',
      star: 'An eight-pointed Ohio star.',
    }),
    complete: score('How far did the piecing get?', ['A few pieces joined', 'About half', 'One or two patches from done', 'Fully pieced, only the last stitches left']),
    origin: choice('Where did the fabrics come from?', ORIGINS),
    mount: choice('How is it held?', {
      pinned: 'Pinned flat on a green gridded cutting mat.',
      stack: 'Lying on top of a pile of blocks already finished.',
      hoop: 'Stretched on muslin in a round wooden embroidery hoop.',
    }),
    stitching: choice('How are the pieced seams stitched?', {
      hidden: 'Tiny concealed stitches leave the seams quiet.',
      running: 'Visible cream running stitches follow each patch edge.',
      cross: 'Contrasting cross stitches decorate the joins.',
      basting: 'Long temporary basting stitches still hold the pieces.',
    }),
    batting: choice('What lies under the pieced top?', {
      none: 'Only the thin backing fabric.',
      thin: 'A thin layer of cotton batting shows at the edges.',
      thick: 'A thick white batting pad gives the block a padded edge.',
      layered: 'Two separate batting layers remain visible before trimming.',
    }),
    binding: choice('What border has been started around the block?', {
      none: 'No border yet.',
      one: 'One long strip is sewn down one side.',
      corners: 'Four contrasting corner patches wait at the edges.',
      all: 'A narrow binding surrounds all four edges.',
    }),
    record: choice('What record of the project lies nearby?', {
      none: 'No paper record.',
      diagram: 'A squared diagram of the block with some cells coloured in.',
      tally: 'A handwritten tally card counting finished blocks.',
      dedication: 'A cloth dedication label is ready to be sewn onto the back.',
    }),
    tool: choice('What quilting tool is beside the work?', {
      none: 'No additional tool.',
      cutter: 'A circular rotary cutter with a shaped handle.',
      ruler: 'A clear acrylic quilting ruler with a black grid.',
      roller: 'A small wooden seam roller.',
    }),
    left: choice('How was the work left?', {
      parked: 'Needle parked neatly in a corner with the thread wound round it, to be picked up tomorrow.',
      glasses: 'A pair of reading glasses folded on top of it, and nobody came back.',
      midstitch: 'Needle left standing mid-stitch, thread running off to the reel, a thimble beside it.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const S = a.mount === 'hoop' ? 0.2 : 0.27;
    const fade = new THREE.Color('#ffffff').lerp(new THREE.Color('#b9b2a4'), mood.wear * 0.28);

    // Fabrics sorted by lightness, so "light" and "dark" patches read as the pattern intends.
    const set = [...FABRICS[a.origin]].sort((p, q) => new THREE.Color(q[0]).getHSL({ h: 0, s: 0, l: 0 }).l - new THREE.Color(p[0]).getHSL({ h: 0, s: 0, l: 0 }).l);
    const materials = set.map((fabric) => new THREE.MeshStandardMaterial({ map: fabricTexture(fabric), color: fade, roughness: fabric[1] === 'lace' || a.origin === 'wedding' ? 0.55 : 0.92, side: THREE.DoubleSide }));
    const split = Math.ceil(set.length / 2);
    const accent = a.pattern === 'logcabin' ? new THREE.MeshStandardMaterial({ color: new THREE.Color('#b3202a').multiply(fade), roughness: 0.9, side: THREE.DoubleSide }) : materials[Math.floor(random() * materials.length)];
    const grouped = new Map<string, THREE.Material>();
    const pick = (patch: Patch) => {
      const choose = () => patch.tone === 'accent' ? accent : patch.tone === 'light' ? materials[Math.floor(random() * split)] : materials[split + Math.floor(random() * (set.length - split))];
      if (!patch.group) return choose();
      if (!grouped.has(patch.group)) grouped.set(patch.group, choose());
      return grouped.get(patch.group)!;
    };

    const muslin = s.material('#e9dfc8', { roughness: 0.95, side: THREE.DoubleSide });
    let top = 0.0008;
    const steel = s.material('#cfd3d6', { metalness: 0.85, roughness: 0.3 });

    if (a.mount === 'hoop') {
      const R = 0.158;
      const cloth = new THREE.PlaneGeometry(0.4, 0.4, 40, 40);
      cloth.rotateX(-Math.PI / 2);
      const pos = cloth.attributes.position, phase = random() * 6;
      for (let v = 0; v < pos.count; v++) {
        const x = pos.getX(v), z = pos.getZ(v), out = Math.min(1, Math.max(0, (Math.hypot(x, z) - R) / 0.035));
        pos.setY(v, 0.0105 - (out * out * (3 - 2 * out)) * 0.0092 + out * (Math.sin(x * 60 + phase) + Math.sin(z * 53 + phase * 2)) * 0.0018);
      }
      cloth.computeVertexNormals();
      s.mesh(cloth, muslin);
      const wood = s.material('#c79a5e', { roughness: 0.5 });
      for (const [radius, y] of [[R, 0.0085], [R - 0.0065, 0.0075]] as const) {
        const hoop = s.mesh(new THREE.TorusGeometry(radius, 0.0038, 8, 72), wood, [0, y, 0]);
        hoop.rotation.x = Math.PI / 2;
        hoop.scale.z = 2.3;
      }
      const brass = s.material('#c79a3e', { metalness: 0.8, roughness: 0.35 });
      s.box([0.03, 0.014, 0.012], [0, 0.0085, -R - 0.006], wood);
      s.rod([-0.022, 0.0085, -R - 0.008], [0.026, 0.0085, -R - 0.008], 0.0028, brass);
      s.cylinder(0.006, 0.006, 0.006, [0.027, 0.0085, -R - 0.008], brass, 10).rotation.z = Math.PI / 2;
      top = 0.0118;
    } else if (a.mount === 'pinned') {
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = 512;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = '#2f6b55';
      ctx.fillRect(0, 0, 512, 512);
      for (let i = 0; i <= 16; i++) {
        ctx.fillStyle = i % 4 === 0 ? 'rgba(240,245,235,0.9)' : 'rgba(240,245,235,0.4)';
        ctx.fillRect(16 + i * 30 - 1, 16, i % 4 === 0 ? 3 : 1.5, 480);
        ctx.fillRect(16, 16 + i * 30 - 1, 480, i % 4 === 0 ? 3 : 1.5);
      }
      ctx.strokeStyle = 'rgba(240,245,235,0.5)'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(16, 16); ctx.lineTo(496, 496); ctx.moveTo(496, 16); ctx.lineTo(16, 496); ctx.stroke();
      // Years of rotary-cutter scars.
      ctx.strokeStyle = 'rgba(20,50,40,0.5)';
      for (let i = 0; i < 6 + mood.wear * 50; i++) { const x = random() * 512, y = random() * 512, t = random() * 6; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(t) * 120, y + Math.sin(t) * 120); ctx.stroke(); }
      const map = new THREE.CanvasTexture(canvas);
      map.colorSpace = THREE.SRGBColorSpace;
      const plain = s.material('#2a5c4a');
      const mat = s.mesh(new THREE.BoxGeometry(0.38, 0.004, 0.38), plain, [0, 0.002, 0]);
      (mat as THREE.Mesh).material = [plain, plain, new THREE.MeshStandardMaterial({ map, roughness: 0.85 }), plain, plain, plain];
      mat.rotation.y = (random() - 0.5) * 0.1;
      top = 0.0048;
    } else {
      const count = 3 + Math.floor(mood.density * 7);
      for (let i = 0; i < count; i++) {
        const side = materials[Math.floor(random() * materials.length)];
        const block = s.mesh(new THREE.BoxGeometry(S * 1.03, 0.004, S * 1.03), side, [(random() - 0.5) * 0.02, 0.002 + i * 0.0042, (random() - 0.5) * 0.02]);
        if (i === count - 1) (block as THREE.Mesh).material = [side, side, muslin, side, side, side];
        block.rotation.y = (random() - 0.5) * 0.22;
      }
      top = count * 0.0042 + 0.001;
    }

    const battingMeshes: THREE.Mesh[] = [];
    if (a.batting !== 'none') {
      const layers = a.batting === 'layered' ? 2 : 1;
      const h = a.batting === 'thin' ? 0.002 : 0.006;
      for (let k = 0; k < layers; k++) {
        battingMeshes.push(s.box([S + 0.018 + k * 0.008, h, S + 0.018 + k * 0.008], [0, top + h / 2 + k * (h + 0.0005), 0], s.material(k === 1 ? '#e8dfc9' : '#f3f0e5', { roughness: 1 })));
      }
      top += layers * (h + 0.0005);
    }

    // Sewn patches, and the ones still waiting.
    const patches = layout(a.pattern, random);
    const sewn = Math.max(2, Math.min(patches.length, Math.round(patches.length * mix(0.18, 1, a.complete))));
    const toShape = (points: P[], about: P, inset: number) => new THREE.Shape(points.map(([u, v]) => new THREE.Vector2((about[0] + (u - about[0]) * inset - about[0]) * S, (about[1] + (v - about[1]) * inset - about[1]) * S)));
    const seam = new THREE.MeshStandardMaterial({ color: '#5a4f42', roughness: 1, side: THREE.DoubleSide });
    const block = new THREE.Group();
    block.position.y = top;
    block.rotation.y = a.mount === 'hoop' ? random() * 0.5 - 0.25 : (random() - 0.5) * 0.16;
    s.root.add(block);
    for (const pad of battingMeshes) { pad.position.y -= top; block.add(pad); }
    patches.slice(0, sewn).forEach((patch, index) => {
      const c = centroid(patch.points);
      const geometry = new THREE.ShapeGeometry(toShape(patch.points, c, 0.965));
      geometry.rotateX(Math.PI / 2);
      const mesh = new THREE.Mesh(geometry, pick(patch));
      mesh.position.set((c[0] - 0.5) * S, a.pattern === 'heart' && index === 1 ? 0.0012 : 0.0004, (c[1] - 0.5) * S);
      mesh.castShadow = mesh.receiveShadow = true;
      block.add(mesh);
      if (!(a.pattern === 'heart' && index === 1)) {
        const under = new THREE.ShapeGeometry(toShape(patch.points, c, 1));
        under.rotateX(Math.PI / 2);
        const shade = new THREE.Mesh(under, seam);
        shade.position.set(mesh.position.x, 0.0001, mesh.position.z);
        shade.receiveShadow = true;
        block.add(shade);
      }
    });
    if (a.stitching !== 'hidden') {
      const matrices: THREE.Matrix4[] = [], turn = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0);
      for (const patch of patches.slice(0, sewn)) {
        const c = centroid(patch.points);
        for (let j = 0; j < patch.points.length; j++) {
          const p = patch.points[j], q = patch.points[(j + 1) % patch.points.length];
          const length = Math.hypot(q[0] - p[0], q[1] - p[1]) * S;
          const n = Math.max(1, Math.floor(length / (a.stitching === 'basting' ? 0.02 : 0.008)));
          const angle = -Math.atan2(q[1] - p[1], q[0] - p[0]);
          for (let k = 0; k < n; k++) {
            const t = (k + 0.5) / n;
            const x = (p[0] + (q[0] - p[0]) * t) * 0.965 + c[0] * 0.035;
            const z = (p[1] + (q[1] - p[1]) * t) * 0.965 + c[1] * 0.035;
            for (const cross of a.stitching === 'cross' ? [-0.7, 0.7] : [0]) matrices.push(new THREE.Matrix4().compose(new THREE.Vector3((x - 0.5) * S, 0.0018, (z - 0.5) * S), turn.clone().setFromAxisAngle(up, angle + cross), new THREE.Vector3(a.stitching === 'basting' ? 0.012 : 0.005, 0.0005, 0.0007)));
          }
        }
      }
      const stitches = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), s.material(a.stitching === 'cross' ? '#8b3345' : '#f3e9ce'), matrices.length);
      matrices.forEach((m, i) => stitches.setMatrixAt(i, m)); stitches.castShadow = true; block.add(stitches);
    }
    if (a.binding !== 'none') {
      const border = materials[materials.length - 1];
      const addBand = (w: number, d: number, x: number, z: number) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, 0.0015, d), border); m.position.set(x, 0.0015, z); m.castShadow = true; block.add(m); };
      if (a.binding === 'corners') for (const x of [-1, 1]) for (const z of [-1, 1]) addBand(0.026, 0.026, x * S / 2, z * S / 2);
      else {
        addBand(0.016, S + 0.016, -S / 2, 0);
        if (a.binding === 'all') { addBand(0.016, S + 0.016, S / 2, 0); for (const side of [-1, 1]) addBand(S, 0.016, 0, side * S / 2); }
      }
    }

    const waiting = patches.slice(sewn, sewn + 9 + Math.floor(mood.density * 4));
    waiting.forEach((patch, index) => {
      const c = centroid(patch.points);
      const geometry = new THREE.ShapeGeometry(toShape(patch.points, c, 1.12));
      geometry.rotateX(Math.PI / 2);
      const mesh = new THREE.Mesh(geometry, pick(patch));
      const reach = (a.mount === 'hoop' ? 0.2 : S / 2 + 0.05);
      mesh.position.set(reach + 0.03 + random() * 0.06, 0.0012 + index * 0.0011, -0.09 + (index / Math.max(1, waiting.length - 1)) * 0.16 + (random() - 0.5) * 0.03);
      mesh.rotation.y = random() * Math.PI * 2;
      mesh.castShadow = mesh.receiveShadow = true;
      s.root.add(mesh);
    });

    // Pins holding the last-joined pieces.
    const frontier = centroid(patches[sewn - 1].points);
    const onBlock = (u: number, v: number, lift = 0) => block.localToWorld(new THREE.Vector3((u - 0.5) * S, lift, (v - 0.5) * S));
    block.updateMatrixWorld(true);
    if (a.mount === 'pinned' || sewn < patches.length) {
      const pinCount = a.mount === 'pinned' ? 6 : 3;
      for (let i = 0; i < pinCount; i++) {
        const patch = patches[Math.max(0, sewn - 1 - (a.mount === 'pinned' ? Math.floor(random() * sewn) : i))];
        const c = centroid(patch.points), at = onBlock(c[0] + (random() - 0.5) * 0.05, c[1] + (random() - 0.5) * 0.05);
        const lean = new THREE.Vector3(random() - 0.5, 1.1, random() - 0.5).normalize().multiplyScalar(0.024);
        s.rod([at.x, at.y, at.z], [at.x + lean.x, at.y + lean.y, at.z + lean.z], 0.0006, steel);
        s.ball([0.0024, 0.0024, 0.0024], [at.x + lean.x, at.y + lean.y, at.z + lean.z], s.material(['#e2332e', '#f2c21d', '#f4f1ea', '#2c7fd1'][Math.floor(random() * 4)], { roughness: 0.3 }), 10);
      }
    }

    // The needle and its thread.
    const threadTint = { baby: '#f4f1ea', work: '#22335e', wedding: '#f4f1ea', feedsack: '#c4474f', mourning: '#17161a', scraps: '#c99a2c' }[a.origin];
    const thread = s.material(threadTint, { roughness: 0.9 });
    if (a.left === 'midstitch') {
      const at = onBlock(frontier[0], frontier[1], 0.001);
      const heading = random() * Math.PI * 2;
      const d = new THREE.Vector3(Math.cos(heading) * 0.75, 0.66, Math.sin(heading) * 0.75).normalize();
      const eye = at.clone().addScaledVector(d, 0.034), tip = at.clone().addScaledVector(d, -0.006);
      s.rod([tip.x, Math.max(tip.y, 0.0005), tip.z], [eye.x, eye.y, eye.z], 0.0004, steel, 0.0008);
      const reelAt = new THREE.Vector3(-(a.mount === 'hoop' ? 0.19 : S / 2 + 0.06), 0, 0.1 + random() * 0.04);
      const mid = at.clone().lerp(reelAt, 0.5);
      const path: [number, number, number][] = [[eye.x, eye.y, eye.z], [eye.x + d.x * 0.004, eye.y - 0.012, eye.z + 0.01], [at.x + 0.015, at.y + 0.002, at.z + 0.02],
        [mid.x + (random() - 0.5) * 0.06, top + 0.002, mid.z + (random() - 0.5) * 0.05], [reelAt.x + 0.04, 0.004, reelAt.z - 0.01], [reelAt.x + 0.012, 0.02, reelAt.z]];
      s.tube(path, 0.0007, thread);
      const reelWood = s.material('#d6b98a');
      s.cylinder(0.011, 0.0155, 0.006, [reelAt.x, 0.003, reelAt.z], reelWood, 16);
      s.cylinder(0.0155, 0.011, 0.006, [reelAt.x, 0.035, reelAt.z], reelWood, 16);
      s.cylinder(0.0135, 0.0135, 0.026, [reelAt.x, 0.019, reelAt.z], thread, 16);
      s.lathe([[0.0085, 0], [0.009, 0.001], [0.0082, 0.014], [0.0068, 0.02], [0.004, 0.0225], [0, 0.023]], s.material('#c4c8cb', { metalness: 0.9, roughness: 0.32, side: THREE.DoubleSide }), [reelAt.x + 0.045, 0, reelAt.z + 0.03]);
    } else {
      const at = onBlock(0.12, 0.86, 0.0016);
      s.rod([at.x - 0.016, at.y, at.z + 0.003], [at.x + 0.02, at.y + 0.001, at.z - 0.004], 0.0004, steel, 0.0008);
      const wind: [number, number, number][] = [];
      for (let i = 0; i <= 16; i++) { const t = i / 16 * Math.PI * 4; wind.push([at.x + Math.sin(t) * 0.009, at.y + 0.001, at.z + Math.sin(t * 2) * 0.004]); }
      s.tube(wind, 0.0007, thread);
    }
    if (a.left === 'glasses') {
      const frame = s.material(mood.warmth > 0.5 ? '#6b4426' : '#2a2a2e', { roughness: 0.35, metalness: 0.2 });
      const glasses = new THREE.Group();
      for (const side of [-1, 1]) {
        const rim = new THREE.Mesh(new THREE.TorusGeometry(0.021, 0.0017, 6, 28), frame);
        rim.rotation.x = Math.PI / 2;
        rim.scale.set(1.12, 0.9, 1);
        rim.position.set(side * 0.027, 0.004, 0);
        const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.021, 0.021, 0.0006, 24), new THREE.MeshStandardMaterial({ color: '#dfeef2', transparent: true, opacity: 0.3, roughness: 0.05, depthWrite: false }));
        lens.scale.x = 1.12;
        lens.position.copy(rim.position);
        const temple = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.0022, 0.003), frame);
        temple.position.set(side * 0.004, 0.0035 + (side > 0 ? 0.003 : 0), -0.023 - (side > 0 ? 0.004 : 0));
        temple.rotation.y = side * 0.06;
        glasses.add(rim, lens, temple);
      }
      const bridge = new THREE.Mesh(new THREE.TorusGeometry(0.007, 0.0015, 6, 12, Math.PI), frame);
      bridge.position.set(0, 0.004, -0.004);
      bridge.rotation.x = -Math.PI / 2;
      glasses.add(bridge);
      glasses.traverse((node) => { node.castShadow = true; });
      const at = onBlock(0.56 + (random() - 0.5) * 0.1, 0.5 + (random() - 0.5) * 0.14, 0.0012);
      glasses.position.copy(at);
      glasses.rotation.y = (random() - 0.5) * 1.2;
      glasses.scale.setScalar(a.mount === 'hoop' ? 0.9 : 1.05);
      s.root.add(glasses);
    }

    if (a.record !== 'none') {
      const canvas = document.createElement('canvas'); canvas.width = 256; canvas.height = 192;
      const c = canvas.getContext('2d')!; c.fillStyle = '#efe3c8'; c.fillRect(0, 0, 256, 192); c.fillStyle = '#514536'; c.font = 'bold 24px serif';
      c.fillText(a.record === 'diagram' ? 'BLOCK PLAN' : a.record === 'tally' ? 'FINISHED BLOCKS' : 'MADE WITH CARE', 10, 30);
      if (a.record === 'diagram') for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) { c.fillStyle = (x + y) % 3 === 0 ? '#936972' : '#e5d8b7'; c.fillRect(40 + x * 34, 48 + y * 31, 30, 27); }
      else if (a.record === 'tally') { c.strokeStyle = '#514536'; c.lineWidth = 3; for (let k = 0; k < 18; k++) { const x = 20 + k % 6 * 34, y = 60 + Math.floor(k / 6) * 42; c.beginPath(); c.moveTo(x, y); c.lineTo(x, y + 22); if (k % 5 === 4) { c.moveTo(x - 30, y + 23); c.lineTo(x + 5, y - 2); } c.stroke(); } }
      else { c.font = 'italic 20px serif'; c.fillText('For the next generation', 15, 95, 226); c.fillText('One piece at a time', 24, 142, 215); }
      const map = new THREE.CanvasTexture(canvas); map.colorSpace = THREE.SRGBColorSpace;
      const paper = s.material('#e6d8b9'), face = s.material('#ffffff', { map });
      const card = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.001, 0.075), [paper, paper, face, paper, paper, paper]); card.position.set(-0.26, 0.0005, -0.1); card.rotation.y = -0.2; card.castShadow = true; s.root.add(card);
    }
    if (a.tool !== 'none') {
      const x = -0.25, z = 0.045;
      const handle = s.material('#9b7650');
      if (a.tool === 'cutter') {
        s.cylinder(0.022, 0.022, 0.002, [x, 0.003, z - 0.025], steel, 32);
        s.box([0.02, 0.008, 0.075], [x, 0.006, z + 0.024], s.material('#cbb048'));
        s.cylinder(0.004, 0.004, 0.004, [x, 0.006, z - 0.025], handle, 12);
      } else if (a.tool === 'ruler') {
        const canvas = document.createElement('canvas'); canvas.width = 128; canvas.height = 512;
        const c = canvas.getContext('2d')!; c.fillStyle = 'rgba(220,234,221,0.35)'; c.fillRect(0, 0, 128, 512); c.strokeStyle = '#39494b'; c.lineWidth = 2;
        for (let i = 0; i < 17; i++) { c.beginPath(); c.moveTo(0, i * 32); c.lineTo(128, i * 32); c.stroke(); }
        for (let i = 0; i < 5; i++) { c.beginPath(); c.moveTo(i * 32, 0); c.lineTo(i * 32, 512); c.stroke(); }
        const map = new THREE.CanvasTexture(canvas); map.colorSpace = THREE.SRGBColorSpace;
        s.box([0.045, 0.002, 0.18], [x, 0.001, z], s.material('#ffffff', { map, transparent: true, opacity: 0.7, depthWrite: false }));
      } else {
        s.rod([x, 0.005, z + 0.04], [x, 0.005, z - 0.005], 0.005, handle);
        s.rod([x, 0.005, z - 0.005], [x, 0.012, z - 0.02], 0.002, steel);
        s.cylinder(0.012, 0.012, 0.03, [x, 0.012, z - 0.02], handle, 20).rotation.z = Math.PI / 2;
      }
    }

    return s.finish();
  },
});
