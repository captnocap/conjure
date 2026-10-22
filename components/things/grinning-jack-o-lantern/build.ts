import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix } from '@conjure/kit';

type Pt = [number, number];
type P3 = [number, number, number];

const circle = (cx: number, cy: number, rx: number, ry = rx, n = 18): Pt[] =>
  Array.from({ length: n }, (_u, i) => [cx + Math.cos((i / n) * 6.283) * rx, cy + Math.sin((i / n) * 6.283) * ry] as Pt);
const mirror = (poly: Pt[]): Pt[] => poly.map(([x, y]) => [-x, y] as Pt).reverse();
/** A smile whose corners turn up; teeth are square notches bitten out of either edge. */
function grin(w: number, top: number, d1: number, d2: number, upper: number[], lower: number[], tooth = 22): Pt[] {
  const n = 24, up: Pt[] = [], low: Pt[] = [];
  for (let i = 0; i <= n; i++) {
    const x = -w + (i / n) * 2 * w, bow = 1 - (x / w) ** 2;
    up.push([x, top + d1 * bow + (upper.includes(i) ? tooth : 0)]);
    low.push([x, top + d2 * bow - (lower.includes(i) ? tooth : 0)]);
    if (upper.includes(i) !== upper.includes(i + 1) && i < n) up.push([x + 0.01, top + d1 * bow + (upper.includes(i + 1) ? tooth : 0)]);
    if (lower.includes(i) !== lower.includes(i + 1) && i < n) low.push([x + 0.01, top + d2 * bow - (lower.includes(i + 1) ? tooth : 0)]);
  }
  return [...up, ...low.reverse()];
}

function faceShapes(kind: string, random: () => number): Pt[][] {
  const tri: Pt[] = [[-98, -28], [-34, -28], [-66, -88]];
  if (kind === 'classic') return [tri, mirror(tri), [[-20, 14], [20, 14], [0, -22]], grin(122, 32, 22, 84, [5, 6, 11, 12, 13, 18, 19], [8, 9, 15, 16])];
  if (kind === 'scared') {
    const brow: Pt[] = [[-104, -84], [-42, -112], [-38, -100], [-100, -70]];
    return [circle(-62, -40, 27, 36), circle(62, -40, 27, 36), brow, mirror(brow), circle(0, 58, 34, 46), [[-10, 0], [10, 0], [0, -14]]];
  }
  if (kind === 'winking') {
    const arc: Pt[] = [];
    for (let i = 0; i <= 10; i++) arc.push([34 + i * 6.4, -40 - Math.sin((i / 10) * Math.PI) * 26]);
    for (let i = 10; i >= 0; i--) arc.push([34 + i * 6.4, -30 - Math.sin((i / 10) * Math.PI) * 12]);
    const g = grin(112, 30, 18, 74, [4, 5, 16, 17], [10, 11]).map(([x, y]) => [x * 0.98 - y * 0.16 + 10, y + x * 0.16] as Pt);
    return [tri, arc, [[-16, 12], [16, 12], [0, -18]], g];
  }
  if (kind === 'snarling') {
    const eye: Pt[] = [[-116, -84], [-28, -36], [-36, -10], [-70, -18], [-104, -40]];
    const brow: Pt[] = [[-124, -108], [-22, -58], [-24, -48], [-126, -96]];
    const up: Pt[] = [], low: Pt[] = [];
    for (let i = 0; i <= 14; i++) {
      const x = -130 + i * (260 / 14), drop = 20 * (x / 130) ** 2;
      up.push([x, 30 + drop + (i % 2 ? 34 : 0)]);
      low.push([x, 104 + drop * 0.4 - (i % 2 ? 0 : 30)]);
    }
    const slit: Pt[] = [[-16, 14], [-6, -12], [-2, 14]];
    return [eye, mirror(eye), brow, mirror(brow), slit, mirror(slit), [...up, ...low.reverse()]];
  }
  if (kind === 'skull') {
    const teeth: Pt[][] = [];
    for (let i = 0; i < 6; i++) { const x = -78 + i * 28; teeth.push([[x, 44], [x + 17, 44], [x + 15, 96], [x + 2, 96]]); }
    return [circle(-56, -44, 38, 40), circle(56, -44, 38, 40), [[-16, 22], [0, -14], [16, 22], [0, 12]], ...teeth];
  }
  // A child's wobbly attempt: nothing matches, nothing is level.
  const wob = (poly: Pt[]) => poly.map(([x, y]) => [x + (random() - 0.5) * 16, y + (random() - 0.5) * 16] as Pt);
  const mouth: Pt[] = [[-80, 40], [-50, 62], [-22, 44], [6, 70], [34, 46], [70, 58], [60, 84], [30, 74], [4, 98], [-24, 72], [-54, 90], [-88, 62]];
  return [wob(circle(-60, -36, 30, 30, 8)), wob(circle(52, -58, 19, 19, 7)), wob([[-8, -4], [14, -8], [12, 14], [-10, 16]]), wob(mouth)];
}

export default defineThing({
  questions: {
    face: choice('What face is carved into it?', {
      classic: 'Classic: triangle eyes, triangle nose and a wide toothy grin.',
      scared: 'Scared: round staring eyes, raised brows and an O of a mouth.',
      winking: 'Winking: one eye a happy slit, a lopsided cheeky grin.',
      snarling: 'Elaborate and snarling: slanted eyes under heavy brows and a mouth full of fangs.',
      child: "A child's wobbly attempt: mismatched lumpy eyes and a crooked zigzag mouth.",
      skull: 'A skull: big round sockets, a nose hole and a row of slot teeth.',
    }),
    shape: choice('What shape is the pumpkin?', {
      round: 'Round and even, the picture-book pumpkin.',
      tall: 'Tall and narrow, a long face.',
      squat: 'Wide and squat like a cushion.',
      lumpy: 'Lopsided and warty, an odd one from the bottom of the bin.',
    }),
    colour: choice('What colour is its skin?', {
      orange: 'Bright classic orange.',
      rust: 'Deep red-orange, almost brick.',
      ghost: 'Pale ghost white.',
      green: 'Unripe dark green streaked with orange.',
      gold: 'Pale golden yellow.',
    }),
    light: choice('What lights it from inside?', {
      candle: 'A real candle: warm orange, flickering.',
      led: 'A battery tea light: cold steady greenish white.',
      red: 'Something red: a bike light or a road flare, hellish.',
      dark: 'Nothing. It has gone out and the face is black holes.',
    }),
    lid: choice('Where is the lid?', {
      on: 'On top with its stem, fitted back in.',
      askew: 'Sitting crooked, half slid off.',
      off: 'Off, leaning beside the pumpkin so the hollow shows.',
    }),
    age: choice('How old is the carving?', {
      tonight: 'Carved tonight: crisp edges, firm, seeds still on the newspaper.',
      week: 'A week old: sagging, folding in on itself, the face drooping and spotted with mould.',
      smashed: 'Smashed in the street on November first: shell in pieces, pulp and seeds everywhere.',
    }),
    perch: choice('What is it sitting on?', {
      bale: 'A straw hay bale tied with twine.',
      step: 'A pair of porch steps.',
      table: 'A small round wooden table.',
      ground: 'The bare ground among fallen leaves.',
      stack: 'On top of a pile of uncarved pumpkins and gourds.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const smashed = a.age === 'smashed', old = a.age === 'week';
    const lit = a.light !== 'dark' && !smashed;
    const glowTint = { candle: '#ffb133', led: '#c9ffb8', red: '#ff3524', dark: '#000000' }[a.light];
    const skinTint = { orange: '#e8741a', rust: '#b9431c', ghost: '#e9e4d2', green: '#4f6b2c', gold: '#e6b84a' }[a.colour];
    const ribs = a.shape === 'squat' ? 12 : a.shape === 'tall' ? 8 : 10;
    const R = 0.25;
    const sx = { round: 1, tall: 0.86, squat: 1.22, lumpy: 1.05 }[a.shape];
    const sy = { round: 0.88, tall: 1.2, squat: 0.76, lumpy: 0.9 }[a.shape] * (old ? 0.9 : 1);
    const lump = a.shape === 'lumpy' ? [random() * 6, random() * 6, random() * 6] : null;

    // Painted skin and the cut-out face. Front (+z) is at u = 0.25.
    const W = 1024, H = 512;
    const canvas = document.createElement('canvas'); canvas.width = W; canvas.height = H;
    const glowCanvas = document.createElement('canvas'); glowCanvas.width = W; glowCanvas.height = H;
    const ctx = canvas.getContext('2d')!, gtx = glowCanvas.getContext('2d')!;
    const skin = new THREE.Color(skinTint).lerp(new THREE.Color('#7a6a4a'), mood.wear * 0.2 + (old ? 0.15 : 0));
    ctx.fillStyle = `#${skin.getHexString()}`; ctx.fillRect(0, 0, W, H);
    for (let k = 0; k <= ribs; k++) {
      const x = (k / ribs) * W;
      const g = ctx.createLinearGradient(x - 26, 0, x + 26, 0);
      g.addColorStop(0, 'rgba(60,20,0,0)'); g.addColorStop(0.5, 'rgba(60,20,0,0.34)'); g.addColorStop(1, 'rgba(60,20,0,0)');
      ctx.fillStyle = g; ctx.fillRect(x - 26, 0, 52, H);
    }
    if (a.colour === 'green') for (let i = 0; i < 40; i++) {
      ctx.fillStyle = `rgba(232,116,26,${0.15 + random() * 0.3})`;
      ctx.fillRect(random() * W, random() * H, 6 + random() * 14, 60 + random() * 200);
    }
    const spots = Math.round(mood.wear * 24 + (old ? 34 : 0) + (smashed ? 16 : 0));
    for (let i = 0; i < spots; i++) {
      const x = random() * W, y = random() * H, r = 3 + random() * 11;
      ctx.fillStyle = random() < 0.3 && old ? 'rgba(200,212,196,0.5)' : 'rgba(40,28,14,0.4)';
      ctx.beginPath(); ctx.arc(x, y, r, 0, 6.283); ctx.fill();
    }
    gtx.fillStyle = '#000'; gtx.fillRect(0, 0, W, H);
    const shapes = faceShapes(a.face, random).map((poly) => poly.map(([x, y]) => {
      const fy = old ? y * 0.86 + 14 + 0.0011 * x * x + Math.sin(x / 30) * 5 : y;
      return [256 + x * 1.22, 236 + fy * 1.22 * (a.shape === 'squat' ? 0.85 : 1)] as Pt;
    }));
    const trace = (c: CanvasRenderingContext2D, poly: Pt[]) => { c.beginPath(); poly.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))); c.closePath(); };
    for (const poly of shapes) {
      trace(ctx, poly);
      ctx.lineJoin = 'round';
      ctx.strokeStyle = 'rgba(70,28,4,0.55)'; ctx.lineWidth = 22; ctx.stroke();
      ctx.strokeStyle = old ? '#8a6a30' : '#f2c46a'; ctx.lineWidth = 8; ctx.stroke();
      const g = ctx.createRadialGradient(256, 240, 10, 256, 240, 230);
      if (lit) { g.addColorStop(0, '#fff6c8'); g.addColorStop(0.5, glowTint); g.addColorStop(1, glowTint); }
      else { g.addColorStop(0, '#1c120a'); g.addColorStop(1, '#0c0705'); }
      ctx.fillStyle = g; ctx.fill();
      if (lit) { trace(gtx, poly); gtx.fillStyle = '#ffffff'; gtx.fill(); }
    }
    const map = new THREE.CanvasTexture(canvas); map.colorSpace = THREE.SRGBColorSpace;
    const glowMap = new THREE.CanvasTexture(glowCanvas);
    const glowBase = lit ? mix(1.1, 2.4, mood.cheer * 0.5 + 0.5) : 0;
    const shell = new THREE.MeshStandardMaterial({ map, roughness: 0.55, emissive: new THREE.Color(glowTint), emissiveMap: glowMap, emissiveIntensity: glowBase });
    const flesh = new THREE.MeshStandardMaterial({ color: old || smashed ? '#c98f3e' : '#f3b65a', roughness: 0.8, side: THREE.BackSide, emissive: new THREE.Color(glowTint), emissiveIntensity: lit ? 0.5 : 0 });

    const pumpkinise = (geometry: THREE.BufferGeometry, r = R) => {
      const pos = geometry.attributes.position as THREE.BufferAttribute, uv = geometry.attributes.uv as THREE.BufferAttribute;
      const v = new THREE.Vector3();
      for (let i = 0; i < pos.count; i++) {
        v.fromBufferAttribute(pos, i).normalize();
        const u = uv.getX(i), polar = Math.acos(THREE.MathUtils.clamp(v.y, -1, 1)), ring = Math.sin(polar);
        let radius = 1 - 0.1 * ring * (1 - Math.abs(Math.sin(u * Math.PI * ribs))) ** 2;
        if (lump) radius *= 1 + 0.07 * Math.sin(v.x * 5 + lump[0]) * Math.sin(v.y * 4 + lump[1]) + 0.05 * Math.sin(v.z * 7 + lump[2]);
        let y = v.y * radius * sy - Math.sign(v.y) * 0.16 * Math.abs(v.y) ** 6;
        let x = v.x * radius * sx, z = v.z * radius * sx;
        if (lump) x += y * 0.14;
        if (old) {
          // The carved front caves in and the crown slumps.
          const front = Math.max(0, v.z) ** 2 * Math.max(0, 0.9 - Math.abs(v.x));
          z -= front * 0.1 * (1 + v.y * 0.5);
          if (y > 0) y *= 0.9 - front * 0.1;
        }
        pos.setXYZ(i, x * r, y * r, z * r);
      }
      geometry.computeVertexNormals();
      return geometry;
    };

    const body = new THREE.Group();
    s.root.add(body);
    const add = <T extends THREE.Object3D>(m: T, g: THREE.Object3D = body) => { g.add(m); return m; };
    const stemMat = s.material('#5d6a2e', { roughness: 0.9 });
    const makeLid = () => {
      const g = new THREE.Group();
      add(s.mesh(pumpkinise(new THREE.SphereGeometry(1, 40, 6, 0, Math.PI * 2, 0, 0.5)), shell), g);
      add(s.mesh(pumpkinise(new THREE.SphereGeometry(1, 40, 6, 0, Math.PI * 2, 0, 0.5), R * 0.93), flesh), g);
      const top = R * sy * 0.82;
      add(s.tube([[0, top - 0.01, 0], [0.005, top + 0.04, 0], [0.03, top + 0.075, 0.01], [0.05, top + 0.085, 0.02]], 0.017, stemMat), g);
      add(s.cylinder(0.02, 0.035, 0.02, [0, top, 0], stemMat, 8), g);
      return g;
    };
    const flames: THREE.Mesh[] = [];
    const candle = (at: P3, parent: THREE.Object3D, lying = false) => {
      const g = new THREE.Group(); g.position.set(...at); parent.add(g);
      if (a.light === 'led') add(s.cylinder(0.03, 0.03, 0.025, [0, 0.012, 0], s.material('#e9e6dc')), g);
      else if (a.light === 'red') add(s.cylinder(0.02, 0.02, 0.09, [0, 0.045, 0], s.material('#b3231c')), g).rotation.z = 0.2;
      else add(s.cylinder(0.022, 0.024, 0.06, [0, 0.03, 0], s.material('#efe6cf')), g);
      if (lying) { g.rotation.z = Math.PI / 2 - 0.1; g.position.y += 0.022; return; }
      if (!lit) return;
      const flame = add(s.mesh(new THREE.ConeGeometry(0.014, 0.05, 8), new THREE.MeshStandardMaterial({ color: glowTint, emissive: glowTint, emissiveIntensity: 2.5 }), [0, a.light === 'candle' ? 0.085 : 0.05, 0]), g);
      flame.castShadow = false;
      flames.push(flame);
    };

    let lidPivot: THREE.Group | null = null;
    if (!smashed) {
      const cut = a.lid === 'on' && !old ? 0 : 0.48;
      add(s.mesh(pumpkinise(new THREE.SphereGeometry(1, 56, 32, 0, Math.PI * 2, cut, Math.PI - cut)), shell));
      if (cut) add(s.mesh(pumpkinise(new THREE.SphereGeometry(1, 40, 20, 0, Math.PI * 2, cut, Math.PI - cut), R * 0.93), flesh));
      if (!cut) {
        const top = R * sy * 0.82;
        add(s.tube([[0, top - 0.01, 0], [0.005, top + 0.04, 0], [0.03, top + 0.075, 0.01], [0.05, top + 0.085, 0.02]], 0.017, stemMat));
        add(s.cylinder(0.02, 0.035, 0.02, [0, top, 0], stemMat, 8));
        const seam = add(s.mesh(new THREE.TorusGeometry(R * sx * 0.47, 0.003, 4, 24), s.material('#5a2a08'), [0, R * sy * 0.82, 0]));
        seam.rotation.x = Math.PI / 2;
      } else {
        const lid = makeLid();
        lidPivot = lid;
        if (a.lid === 'off') {
          const prop = new THREE.Group();
          lid.position.y = -R * sy * 0.85;
          prop.add(lid);
          if (a.perch === 'stack') { prop.position.set(0.14, -R * sy * 0.9 - 0.24 + 0.05, 0.5); prop.rotation.set(1.15, 0, 0.2); }
          else { prop.position.set(R * sx * 0.8 + 0.07, -R * sy * 0.9 + 0.07, 0.13); prop.rotation.set(0.25, 0, -1.05); }
          body.add(prop);
        } else if (a.lid === 'askew' || old) {
          lid.position.set(0.035, old ? -0.03 : 0.004, -0.02);
          lid.rotation.set(-0.12, random() * 3, old ? 0.3 : 0.2);
        }
        if (!lid.parent) body.add(lid);
        candle([0, -R * sy * 0.8, 0], body);
      }
      body.position.y = R * sy * (old ? 0.86 : 0.9);
      body.rotation.y = (random() - 0.5) * 0.3;
      body.rotation.x = -0.16;
      if (old) body.rotation.z = (random() - 0.5) * 0.16;
    } else {
      // Shell fragments flung across the road, some face up, some bowl up.
      const cuts: [number, number, number, number][] = [
        [0.07, 0.19, 0.45, 1.95], [0.26, 0.19, 0.45, 1.1], [0.26, 0.2, 1.55, 0.95], [0.46, 0.27, 0.5, 1.9], [0.74, 0.31, 0.6, 1.8],
      ];
      cuts.forEach(([u0, du, t0, dt], i) => {
        const geometry = pumpkinise(new THREE.SphereGeometry(1, Math.ceil(du * 56), 14, u0 * 6.283, du * 6.283, t0, dt));
        const mid = (u0 + du / 2) * 6.283;
        geometry.rotateY(-Math.atan2(-Math.cos(mid), Math.sin(mid)));
        geometry.center();
        const piece = new THREE.Group();
        add(s.mesh(geometry, shell), piece);
        add(s.mesh(geometry, flesh), piece);
        const faceUp = i < 3 ? random() < 0.85 : random() < 0.4;
        const ang = (i / cuts.length) * 6.283 + random(), far = i === 0 ? 0.12 : 0.22 + random() * 0.2;
        piece.rotation.set((faceUp ? -1 : 1) * Math.PI / 2 + (random() - 0.5) * 0.3, 0, random() * 6.283);
        piece.position.set(Math.sin(ang) * far, 0.045 + random() * 0.02, Math.cos(ang) * far * 0.8 + 0.1);
        s.root.add(piece);
      });
      const bowl = new THREE.Group();
      add(s.mesh(pumpkinise(new THREE.SphereGeometry(1, 40, 8, 0, Math.PI * 2, 2.3, Math.PI - 2.3)), shell), bowl);
      add(s.mesh(pumpkinise(new THREE.SphereGeometry(1, 40, 8, 0, Math.PI * 2, 2.3, Math.PI - 2.3), R * 0.93), flesh), bowl);
      bowl.position.set(-0.05, R * sy * 0.9, -0.12); bowl.rotation.z = 0.15;
      s.root.add(bowl);
      const lid = makeLid();
      lid.position.set(0.36, -R * sy * 0.52, -0.2); lid.rotation.set(0.3, random() * 6, 0.25);
      s.root.add(lid);
      const pulp = s.material('#e08a2a', { roughness: 0.6 });
      for (let i = 0; i < 7; i++) s.ball([0.05 + random() * 0.08, 0.008, 0.04 + random() * 0.07], [(random() - 0.5) * 0.8, 0.006, (random() - 0.5) * 0.7], pulp, 10).rotation.y = random() * 3;
      if (a.light !== 'dark') candle([0.2, 0, 0.3], s.root, true);
    }

    // Seeds and stringy pulp: fresh on newspaper, or sprayed over the street.
    const seedCount = smashed ? 60 : a.age === 'tonight' ? Math.round(mix(6, 26, mood.density)) : 0;
    let floorY = 0;
    const perch = smashed ? 'ground' : a.perch;
    const straw = s.material('#d9b85a', { roughness: 0.95 });
    if (perch === 'bale') {
      floorY = 0.3;
      const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d')!;
      x.fillStyle = '#d2b052'; x.fillRect(0, 0, 128, 128);
      for (let i = 0; i < 900; i++) { x.strokeStyle = ['#f0d98a', '#b08a34', '#e6c868', '#8f7028'][i % 4]; x.beginPath(); const px = random() * 128, py = random() * 128; x.moveTo(px, py); x.lineTo(px + 6 + random() * 14, py + (random() - 0.5) * 4); x.stroke(); }
      const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(3, 2);
      s.box([0.8, 0.3, 0.46], [0, 0.15, 0], s.material('#ffffff', { map: tex, roughness: 1 }));
      for (const bx of [-0.25, 0.25]) s.box([0.012, 0.31, 0.47], [bx * 0.8, 0.15, 0], s.material('#c0452f'));
      const bits: { at: P3; size: number }[] = [];
      for (let i = 0; i < 50; i++) bits.push({ at: [(random() - 0.5) * 1.0, 0.004 + (random() < 0.3 ? 0.3 : 0), (random() - 0.5) * 0.7], size: 0.5 + random() });
      const strawBits = s.scatter(new THREE.BoxGeometry(0.09, 0.004, 0.006), straw, bits);
      const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
      bits.forEach((b, i) => { e.set(0, random() * 6.283, 0); q.setFromEuler(e); m.compose(new THREE.Vector3(...b.at), q, new THREE.Vector3(b.size, 1, 1)); strawBits.setMatrixAt(i, m); });
    } else if (perch === 'step') {
      floorY = 0.3;
      const wood = s.material(mood.warmth > 0.5 ? '#8f7a62' : '#8a8f8f', { roughness: 0.9 });
      s.box([0.85, 0.15, 0.85], [0, 0.075, 0.12], wood);
      s.box([0.85, 0.15, 0.5], [0, 0.225, -0.055], wood);
      for (const y of [0.15, 0.3]) s.box([0.88, 0.025, 0.05], [0, y - 0.005, y === 0.15 ? 0.54 : 0.19], s.material('#6f6250'));
    } else if (perch === 'table') {
      floorY = 0.42;
      const wood = s.material('#7a5232', { roughness: 0.6 });
      s.cylinder(0.46, 0.46, 0.03, [0, 0.405, 0], wood, 28);
      s.cylinder(0.03, 0.04, 0.38, [0, 0.2, 0], wood, 10);
      for (let i = 0; i < 3; i++) s.rod([0, 0.08, 0], [Math.sin(i * 2.094) * 0.24, 0.01, Math.cos(i * 2.094) * 0.24], 0.022, wood);
      if (a.age === 'tonight') s.box([0.42, 0.003, 0.3], [0.03, 0.422, 0.06], s.material('#e6e2d6')).rotation.y = 0.3;
    } else if (perch === 'stack') {
      floorY = 0.24;
      const tints = ['#e8741a', '#d9622a', '#e6b84a', '#4f6b2c', '#e9e4d2', '#c9531c'];
      const pile: P3[] = [[-0.4, 0.11, 0.02], [0.41, 0.1, 0.0], [0.33, 0.07, 0.26], [-0.34, 0.075, 0.27], [-0.02, 0.06, 0.36]];
      pile.forEach(([px, py, pz], i) => {
        const r = py / 0.8;
        const geometry = new THREE.SphereGeometry(1, 20, 12);
        const pos = geometry.attributes.position as THREE.BufferAttribute, uv = geometry.attributes.uv as THREE.BufferAttribute;
        for (let k = 0; k < pos.count; k++) {
          const f = 1 - 0.1 * (1 - Math.abs(Math.sin(uv.getX(k) * Math.PI * 8))) ** 2;
          pos.setXYZ(k, pos.getX(k) * f * r, pos.getY(k) * 0.8 * r, pos.getZ(k) * f * r);
        }
        geometry.computeVertexNormals();
        s.mesh(geometry, s.material(tints[Math.floor(random() * tints.length)], { roughness: 0.55 }), [px, py, pz]).rotation.y = random() * 3;
        s.cylinder(0.012, 0.018, 0.05, [px, py * 1.85, pz], stemMat, 6);
      });
      s.box([0.5, 0.24, 0.44], [0, 0.12, -0.02], s.material('#8a6a3c', { roughness: 0.9 }));
      for (const y of [0.06, 0.18]) s.box([0.52, 0.02, 0.46], [0, y, -0.02], s.material('#6b4f2a'));
    }
    if (!smashed) body.position.y += floorY;

    // Fallen leaves, more of them the denser the scene.
    const leafCount = Math.round(mix(4, 34, mood.density)) + (perch === 'ground' ? 14 : 0);
    const leafShape = new THREE.Shape();
    leafShape.moveTo(0, 0.05); leafShape.lineTo(0.025, 0.015); leafShape.lineTo(0.04, 0.02); leafShape.lineTo(0.02, -0.01); leafShape.lineTo(0.03, -0.035); leafShape.lineTo(0, -0.02);
    leafShape.lineTo(-0.03, -0.035); leafShape.lineTo(-0.02, -0.01); leafShape.lineTo(-0.04, 0.02); leafShape.lineTo(-0.025, 0.015);
    const leafGeometry = new THREE.ShapeGeometry(leafShape); leafGeometry.rotateX(-Math.PI / 2);
    const leaves = new THREE.InstancedMesh(leafGeometry, new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.9, side: THREE.DoubleSide }), leafCount);
    const m4 = new THREE.Matrix4(), quat = new THREE.Quaternion(), euler = new THREE.Euler();
    for (let i = 0; i < leafCount; i++) {
      const ang = random() * 6.283, far = 0.28 + random() * 0.3;
      euler.set((random() - 0.5) * 0.3, random() * 6.283, (random() - 0.5) * 0.3); quat.setFromEuler(euler);
      const size = 0.8 + random() * 0.8;
      m4.compose(new THREE.Vector3(Math.sin(ang) * far, 0.004 + random() * 0.006, Math.cos(ang) * far), quat, new THREE.Vector3(size, size, size));
      leaves.setMatrixAt(i, m4);
      leaves.setColorAt(i, new THREE.Color(['#c9531c', '#d98a1e', '#8a3a1c', '#b89a2a', '#6b4a22'][Math.floor(random() * 5)]));
    }
    leaves.receiveShadow = true;
    s.root.add(leaves);
    if (seedCount) {
      const seeds: { at: P3; size: number }[] = [];
      for (let i = 0; i < seedCount; i++) {
        const ang = random() * 6.283, far = smashed ? random() * 0.5 : R * sx + 0.02 + random() * 0.1;
        const onPerch = !smashed && perch !== 'ground' && perch !== 'stack';
        const reach = onPerch ? Math.min(far, perch === 'table' ? 0.42 : 0.21) : far;
        seeds.push({ at: [Math.sin(ang) * reach * (perch === 'bale' ? 1.6 : 1), (onPerch ? floorY : 0) + 0.006, Math.cos(ang) * reach * 0.9 + (onPerch ? 0.02 : 0)], size: 0.8 + random() * 0.5 });
      }
      const seedGeometry = new THREE.SphereGeometry(0.008, 6, 4); seedGeometry.scale(1, 0.35, 1.7);
      s.scatter(seedGeometry, s.material('#efe2b8', { roughness: 0.5 }), seeds);
    }

    const phase = random() * 10, flick = a.light === 'candle' ? 1 : a.light === 'red' ? 0.4 : 0.06;
    return s.finish({
      update: (_dt, time) => {
        if (!lit) return;
        const t = time * mix(4, 16, mood.energy) + phase;
        const n = Math.sin(t) * 0.5 + Math.sin(t * 2.7 + 1) * 0.3 + Math.sin(t * 6.1) * 0.2;
        const k = 1 + n * flick * mix(0.12, 0.45, mood.energy);
        shell.emissiveIntensity = glowBase * k;
        flesh.emissiveIntensity = 0.5 * k;
        for (const f of flames) { f.scale.set(1, 0.8 + k * 0.3, 1); f.rotation.z = n * 0.25; }
        if (lidPivot && a.lid === 'askew') lidPivot.rotation.x = -0.12;
      },
    });
  },
});
