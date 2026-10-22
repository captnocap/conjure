import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix } from '@conjure/kit';

const TILE = 1.6;

function limb(points: THREE.Vector3[], r0: number, r1: number, phase: number, radial = 6) {
  const curve = new THREE.CatmullRomCurve3(points);
  const segs = Math.max(8, points.length * 4);
  const frames = curve.computeFrenetFrames(segs, false);
  const pos: number[] = [], idx: number[] = [];
  for (let i = 0; i <= segs; i++) {
    const t = i / segs, c = curve.getPointAt(t), r = mix(r0, r1, t ** 0.8);
    const n = frames.normals[i], b = frames.binormals[i];
    for (let j = 0; j <= radial; j++) {
      const a = (j / radial) * Math.PI * 2;
      const k = r * (1 + 0.15 * Math.sin(a * 3 + i * 0.7 + phase));
      pos.push(c.x + (n.x * Math.cos(a) + b.x * Math.sin(a)) * k, c.y + (n.y * Math.cos(a) + b.y * Math.sin(a)) * k, c.z + (n.z * Math.cos(a) + b.z * Math.sin(a)) * k);
    }
  }
  for (let i = 0; i < segs; i++)
    for (let j = 0; j < radial; j++) {
      const p = i * (radial + 1) + j, q = p + radial + 1;
      idx.push(p, q, p + 1, p + 1, q, q + 1);
    }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

export default defineThing({
  questions: {
    ruin: choice('How much of the cottage is still standing?', {
      walls: 'All four walls to the eaves and both gables with their chimneys: only the roof is gone.',
      gable: 'One gable has fallen outward into a heap of stones; the other still stands.',
      footings: 'One gable stands over walls worn down to waist height.',
      lone: 'A single gable and chimney standing alone over a rectangle of tumbled footings.',
    }),
    stone: choice('What are the walls built of?', {
      grey: 'Grey fieldstone laid dry, furred with lichen.',
      limewash: 'Stone under old whitewash, flaking off in sheets.',
      dark: 'Black basalt and whinstone, sombre even in sun.',
      red: 'Warm red-brown sandstone.',
    }),
    roof: choice('Is anything left of the roof?', {
      none: 'Nothing: open to the sky.',
      rafters: 'A few blackened rafter couples still span the walls like ribs.',
      tin: 'Rusted corrugated iron sheets sagging over one end.',
      thatch: 'A slumped remnant of thatch and sod at one end, grass growing on it.',
    }),
    tree: choice('What is growing inside?', {
      rowan: 'A rowan tree rooted in the floor, its crown above the walls, hung with red berries.',
      thorn: 'A bare wind-bent hawthorn leaning out over the wall.',
      ivy: 'Ivy smothering one gable and its chimney.',
      nettles: 'Only a deep bed of nettles and docks, wall to wall.',
    }),
    left: choice('What did the family leave behind?', {
      nothing: 'Nothing that has lasted.',
      pot: 'An iron pot still hanging from the crane in the hearth.',
      bed: 'The rusted frame of an iron bedstead.',
      door: 'The door itself, hanging from one hinge with its paint peeling.',
      wheel: 'A broken cart wheel leaning against the front wall.',
      memorial: 'Nothing of theirs, but someone has since built a small cairn with a plaque and flowers by the door.',
    }),
    outside: choice('What surrounds it?', {
      none: 'Open moor right up to the walls.',
      ridges: 'The parallel ridges of old potato beds, still visible under the grass.',
      wall: 'A low tumbled field wall making a small yard.',
      path: 'A line of flagstones leading to the door.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const rr = (lo: number, hi: number) => lo + (hi - lo) * random();
    const C = (hex: string) => new THREE.Color(hex);
    const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
    const L = 7.4, D = 4.2, T = 0.55, EAVE = 1.9, PEAK = 3.9;

    // Drystone texture.
    const base = C({ grey: '#8d8a80', limewash: '#dedacb', dark: '#55565a', red: '#9a6a52' }[a.stone]);
    base.lerp(C('#a58a60'), (mood.warmth - 0.5) * 0.14);
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 256;
    const g = canvas.getContext('2d')!;
    g.fillStyle = `#${base.clone().multiplyScalar(a.stone === 'limewash' ? 0.8 : 0.35).getHexString()}`;
    g.fillRect(0, 0, 256, 256);
    for (let y = 0; y < 256;) {
      const h = Math.min(rr(22, 38), 256 - y);
      for (let x = -rr(0, 40); x < 256;) {
        const w = rr(30, 85);
        const flaked = a.stone === 'limewash' && random() < mix(0.1, 0.45, mood.wear);
        const tint = (flaked ? C('#85827a') : base.clone()).offsetHSL(rr(-0.01, 0.01), 0, rr(-0.07, 0.07));
        g.fillStyle = `#${tint.getHexString()}`;
        g.beginPath();
        g.roundRect(x + 1.5, y + 1.5, w - 3, h - 3, 5);
        g.fill();
        if (random() < mix(0.08, 0.3, mood.wear)) { g.fillStyle = random() < 0.5 ? 'rgba(210,205,180,0.5)' : 'rgba(110,125,60,0.5)'; g.beginPath(); g.arc(x + w / 2, y + h / 2, h * 0.3, 0, 6.3); g.fill(); }
        x += w;
      }
      y += h;
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    const stone = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.95 });
    const plain = new THREE.MeshStandardMaterial({ color: base.clone().multiplyScalar(0.72), roughness: 0.95, flatShading: true });

    const wall = (w: number, h: number, d: number, x: number, y: number, z: number) => {
      const geometry = new THREE.BoxGeometry(w, h, d);
      const uv = geometry.attributes.uv;
      const ou = random(), ov = (y - h / 2) / TILE;
      for (let f = 0; f < 6; f++) {
        const [du, dv] = f < 2 ? [d, h] : f < 4 ? [w, d] : [w, h];
        for (let k = 0; k < 4; k++) uv.setXY(f * 4 + k, uv.getX(f * 4 + k) * du / TILE + ou, uv.getY(f * 4 + k) * dv / TILE + ov);
      }
      return s.mesh(geometry, stone, [x, y, z]);
    };

    const ruin = a.ruin;
    const wallBase = ruin === 'footings' ? 0.85 : ruin === 'lone' ? 0.4 : EAVE;
    const ragged = mix(0.05, 0.3, mood.wear) + (ruin === 'walls' ? 0 : 0.12);
    const fallenSide = random() < 0.5 ? -1 : 1; // which gable is down, if one is
    const gableUp = (side: number) => ruin === 'walls' || side !== fallenSide;
    const rubble: { at: readonly [number, number, number]; size: number }[] = [];
    const heap = (x: number, z: number, n: number, spread: number, rise = 0.5) => {
      for (let i = 0; i < n; i++) { const th = random() * 6.28, d = Math.sqrt(random()) * spread; rubble.push({ at: [x + Math.cos(th) * d, rise * (1 - d / spread) * rr(0.3, 1) + 0.06, z + Math.sin(th) * d * 0.8], size: rr(0.08, 0.19) }); }
    };

    // Long walls, built in short lengths so the tops can be ragged.
    const door = [-0.75, 0.2], windows = [[-2.75, -2.0], [1.6, 2.35]];
    const seg = 0.5;
    let doorLintel = false;
    for (const side of [1, -1]) {
      const z = side * (D / 2 - T / 2);
      for (let x = -L / 2 + T; x < L / 2 - T - 0.01; x += seg) {
        const mid = x + seg / 2;
        const edge = Math.min(1, Math.min(mid + L / 2, L / 2 - mid) / 1.2);
        let h = wallBase * (1 - ragged * random() * (ruin === 'walls' ? 0.5 : 1));
        // Walls stand higher where a gable still braces them.
        if (ruin !== 'walls') { const near = mid < 0 ? -1 : 1; if (gableUp(near)) h = mix(Math.min(EAVE, wallBase * 1.8) * rr(0.8, 1), h, edge); else h *= mix(0.5, 1, edge); }
        const isDoor = side === 1 && mid > door[0] && mid < door[1];
        const isWindow = (side === 1 && windows.some(([p, q]) => mid > p && mid < q)) || (side === -1 && mid > 0.4 && mid < 1.2);
        if (isDoor) { if (h > 1.75) doorLintel = true; continue; }
        if (isWindow) {
          wall(seg, Math.min(h, 0.85), T, mid, Math.min(h, 0.85) / 2, z);
          if (h > 1.65) wall(seg, h - 1.5, T, mid, 1.5 + (h - 1.5) / 2, z);
          continue;
        }
        wall(seg + 0.01, h, T, mid, h / 2, z);
        if (random() < ragged) rubble.push({ at: [mid, h + 0.06, z + rr(-0.1, 0.1)], size: rr(0.1, 0.2) });
      }
    }
    const slab = s.material(base.clone().multiplyScalar(0.7), { roughness: 0.9 });
    if (doorLintel || ruin === 'walls') s.box([1.35, 0.18, T + 0.04], [(door[0] + door[1]) / 2, 1.82, D / 2 - T / 2], slab);
    for (const [p, q] of windows) if (ruin === 'walls') s.box([q - p + 0.5, 0.14, T + 0.04], [(p + q) / 2, 1.45, D / 2 - T / 2], slab);

    // Gables.
    let hearthSide = 0;
    const chimneyTops: THREE.Vector3[] = [];
    for (const side of [-1, 1]) {
      const x = side * (L / 2 - T / 2);
      if (gableUp(side)) {
        const shape = new THREE.Shape();
        const bite = ruin === 'walls' ? 0 : rr(0, 0.5);
        shape.moveTo(-D / 2, 0); shape.lineTo(D / 2, 0); shape.lineTo(D / 2, EAVE - bite); shape.lineTo(0.35, PEAK - 0.25); shape.lineTo(-0.35, PEAK - 0.25); shape.lineTo(-D / 2, EAVE - rr(0, bite)); shape.closePath();
        const geometry = new THREE.ExtrudeGeometry(shape, { depth: T, bevelEnabled: false });
        const uv = geometry.attributes.uv;
        for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / TILE, uv.getY(i) / TILE);
        geometry.translate(0, 0, -T / 2);
        const gable = s.mesh(geometry, stone, [x, 0, 0]);
        gable.rotation.y = Math.PI / 2;
        // Chimney with a drip course and a cap.
        const stump = mood.wear > 0.7 && random() < 0.5;
        const ch = stump ? 0.3 : 0.85;
        wall(T + 0.12, ch, 0.8, x, PEAK - 0.25 + ch / 2, 0);
        if (!stump) { s.box([T + 0.24, 0.07, 0.92], [x, PEAK - 0.25 + ch, 0], slab); if (a.stone !== 'dark' && random() < 0.6) s.cylinder(0.13, 0.15, 0.3, [x, PEAK - 0.07 + ch, 0], s.material('#9a5a3c', { roughness: 0.9 }), 10); }
        chimneyTops.push(V(x, PEAK - 0.25 + ch, 0));
        if (!hearthSide) hearthSide = side;
      } else {
        // The fallen gable: a low stub and a fan of stones thrown outward.
        const low = rr(0.4, 0.8);
        wall(T, low, D, x, low / 2, 0);
        heap(x + side * 0.9, 0, Math.round(mix(60, 100, mood.density)), 1.6, 0.8);
        heap(x - side * 0.6, 0, 14, 1.2, 0.3);
      }
    }
    if (!hearthSide) hearthSide = 1;
    // Hearth: a dark opening in the inner face of the standing gable, with its lintel.
    const hx = hearthSide * (L / 2 - T) - hearthSide * 0.02;
    s.box([0.06, 1.0, 1.1], [hx, 0.5, 0], s.material('#17120f', { roughness: 1 }));
    s.box([0.2, 0.16, 1.5], [hx - hearthSide * 0.08, 1.1, 0], slab);
    s.box([0.9, 0.06, 1.6], [hx - hearthSide * 0.45, 0.03, 0], slab);

    // Rubble at the wall feet.
    for (let i = 0; i < Math.round(mix(10, 60, mood.wear) + (ruin === 'walls' ? 0 : 30)); i++) {
      const along = random() < 0.7;
      const x = along ? rr(-L / 2, L / 2) : (random() < 0.5 ? -1 : 1) * (L / 2 + rr(-0.9, 0.5));
      const z = along ? (random() < 0.5 ? -1 : 1) * (D / 2 + rr(-0.9, 0.5)) : rr(-D / 2, D / 2);
      rubble.push({ at: [x, 0.07, z], size: rr(0.09, 0.22) });
    }
    if (rubble.length) s.scatter(new THREE.DodecahedronGeometry(1, 0), plain, rubble);

    // Ground: a worn green platform where the house stood.
    const turf = C('#5d6436').lerp(C('#6a5a3a'), 1 - mood.cheer * 0.6);
    const pad = s.box([L + 2.0, 0.06, D + 2.0], [0, 0.03, 0.1], new THREE.MeshStandardMaterial({ color: turf, roughness: 1 }));
    pad.castShadow = false;
    s.box([L - 2 * T, 0.03, D - 2 * T], [0, 0.07, 0], s.material('#4a4030', { roughness: 1 })).castShadow = false;

    // Nettles and docks.
    const nettleDepth = a.tree === 'nettles' ? 1 : 0.35;
    const weeds: { at: readonly [number, number, number]; size: number; color: string }[] = [];
    const greens = ['#4f7a2e', '#5d8a35', '#3f6a2a', '#6f8f3a', '#7a4a3a'];
    for (let i = 0; i < Math.round(mix(40, 110, mood.wear) * nettleDepth + 16); i++) {
      const inHearth = i < 14;
      const x = inHearth ? hx - hearthSide * rr(0.1, 0.9) : rr(-L / 2 + T + 0.1, L / 2 - T - 0.1);
      const z = inHearth ? rr(-0.6, 0.6) : rr(-D / 2 + T + 0.1, D / 2 - T - 0.1);
      weeds.push({ at: [x, 0.07, z], size: rr(0.35, a.tree === 'nettles' ? 1.0 : 0.7), color: greens[Math.floor(random() * (inHearth ? 4 : 5))] });
    }
    for (let i = 0; i < 26; i++) weeds.push({ at: [rr(-L / 2 - 0.9, L / 2 + 0.9), 0.05, (random() < 0.5 ? -1 : 1) * (D / 2 + rr(0.1, 0.6))], size: rr(0.25, 0.55), color: greens[Math.floor(random() * 4)] });
    const nettle = new THREE.ConeGeometry(0.16, 1, 5);
    nettle.translate(0, 0.5, 0);
    s.scatter(nettle, new THREE.MeshStandardMaterial({ roughness: 1, flatShading: true }), weeds);

    // Roof remains.
    const pitch = Math.atan2(PEAK - 0.35 - EAVE, D / 2), run = Math.hypot(PEAK - 0.35 - EAVE, D / 2);
    const roofEnd = hearthSide; // what is left clings to the standing gable
    if (a.roof === 'rafters') {
      const char = s.material('#2a2420', { roughness: 0.9 });
      const n = 3 + Math.floor(random() * 2);
      for (let i = 0; i < n; i++) {
        const x = roofEnd * (L / 2 - 0.9 - i * 1.1);
        const whole = random() > mix(0.1, 0.6, mood.wear);
        s.rod([x, EAVE - 0.05, D / 2 - T / 2], [x, PEAK - 0.35, 0], 0.055, char);
        if (whole) { s.rod([x, EAVE - 0.05, -D / 2 + T / 2], [x, PEAK - 0.35, 0], 0.055, char); s.rod([x, EAVE + 0.75, 1.15], [x, EAVE + 0.75, -1.15], 0.04, char); }
        else s.rod([x + 0.2, 0.1, -D / 2 + T + 0.3], [x - 0.5, EAVE - 0.3, -D / 2 + T / 2], 0.055, char);
      }
      s.rod([roofEnd * (L / 2 - 0.6), PEAK - 0.33, 0], [roofEnd * (L / 2 - 0.9 - (n - 1) * 1.1 - 0.4), PEAK - 0.4, 0], 0.045, char);
    } else if (a.roof === 'tin' || a.roof === 'thatch') {
      const cover = (zSide: number, x0: number, len: number, sag: number) => {
        const geometry = new THREE.PlaneGeometry(len, run + 0.35, a.roof === 'tin' ? Math.round(len / 0.09) : 6, 4);
        const p = geometry.attributes.position;
        for (let i = 0; i < p.count; i++) {
          const u = p.getX(i) / len + 0.5;
          let z = -Math.sin(u * Math.PI) * sag * 0.3 - (roofEnd > 0 ? 1 - u : u) * sag;
          if (a.roof === 'tin') z += Math.sin((p.getX(i) / 0.09) * Math.PI) * 0.018;
          else z += rr(-0.04, 0.04);
          p.setZ(i, z);
        }
        geometry.computeVertexNormals();
        const rust = C('#7a3f26').lerp(C('#6f7a80'), 1 - mix(0.4, 1, mood.wear));
        const material = a.roof === 'tin' ? new THREE.MeshStandardMaterial({ color: rust, roughness: 0.7, metalness: 0.4, side: THREE.DoubleSide }) : new THREE.MeshStandardMaterial({ color: C('#6d6238').lerp(C('#56682f'), 0.4), roughness: 1, side: THREE.DoubleSide, flatShading: true });
        const m = s.mesh(geometry, material, [x0, (EAVE + PEAK - 0.35) / 2 + 0.06, zSide * (D / 4)]);
        m.rotation.x = zSide * (pitch - Math.PI / 2) + (zSide < 0 ? Math.PI : 0);
        return m;
      };
      const len = rr(2.2, 3.2);
      const x0 = roofEnd * (L / 2 - T - len / 2 + 0.2);
      cover(1, x0, len, rr(0.1, 0.5) * mix(0.5, 1.3, mood.wear));
      cover(-1, x0, len * rr(0.5, 1), rr(0.1, 0.5) * mix(0.5, 1.3, mood.wear));
      if (a.roof === 'thatch') {
        s.scatter(nettle.clone(), new THREE.MeshStandardMaterial({ color: '#7a8f3a', roughness: 1, flatShading: true }), Array.from({ length: 30 }, () => { const u = rr(-0.9, 0.9), x = x0 + rr(-len / 2, len / 2); return { at: [x, PEAK - 0.4 - Math.abs(u) * (PEAK - 0.35 - EAVE) * 0.95, u * D / 2] as const, size: rr(0.2, 0.4) }; }));
      } else {
        // One sheet has slid off and lies in the nettles.
        const sheet = s.box([0.9, 0.02, 1.9], [x0 - roofEnd * (len / 2 + 0.8), 0.14, 0.3], new THREE.MeshStandardMaterial({ color: '#7d4a30', roughness: 0.8, metalness: 0.3 }));
        sheet.rotation.set(rr(-0.1, 0.1), rr(0, 1), rr(-0.15, 0.15));
      }
    }

    // What grows inside.
    const bark = s.material('#5e554b', { roughness: 0.9 });
    const addLimb = (pts: THREE.Vector3[], r0: number, r1: number) => s.mesh(limb(pts, r0, r1, random() * 6), bark);
    const sway: THREE.Object3D[] = [];
    if (a.tree === 'rowan' || a.tree === 'thorn') {
      const thorn = a.tree === 'thorn';
      const tx = -hearthSide * rr(0.6, 1.6), tz = rr(-0.4, 0.4);
      const bend = thorn ? rr(1.2, 1.8) * (random() < 0.5 ? -1 : 1) : rr(-0.4, 0.4);
      const height = thorn ? 2.9 : rr(4.6, 5.4);
      const top = V(tx + bend, height, tz + (thorn ? -0.6 : rr(-0.3, 0.3)));
      addLimb([V(tx, 0, tz), V(tx + bend * 0.1, height * 0.35, tz + 0.1), V(tx + bend * 0.45, height * 0.7, tz), top], thorn ? 0.13 : 0.15, 0.04);
      const crown = new THREE.Group();
      s.root.add(crown);
      const leaves: { at: readonly [number, number, number]; size: number; color: string }[] = [], berries: { at: readonly [number, number, number]; size: number }[] = [];
      const leafTints = mood.warmth > 0.65 ? ['#b8862e', '#a8642a', '#7a8a35', '#c9a23a'] : ['#4f7d34', '#5f8f3c', '#42692e', '#6f9a44'];
      const nb = thorn ? 9 : 8;
      for (let i = 0; i < nb; i++) {
        const from = V(tx + bend * mix(0.25, 0.8, i / nb), height * mix(0.45, 0.85, i / nb), tz);
        const th = random() * 6.28, len = thorn ? rr(0.7, 1.4) : rr(0.9, 1.6);
        const end = from.clone().add(V(Math.cos(th) * len * (thorn ? 0.5 : 1) + (thorn ? Math.sign(bend) * len * 0.8 : 0), thorn ? rr(-0.1, 0.4) : rr(0.4, 1.1), Math.sin(th) * len * 0.8));
        addLimb([from, from.clone().lerp(end, 0.5).add(V(0, 0.15, 0)), end], 0.05, 0.015);
        if (thorn) { for (let k = 0; k < 3; k++) { const e2 = end.clone().add(V(rr(-0.4, 0.4) + Math.sign(bend) * 0.3, rr(-0.1, 0.3), rr(-0.4, 0.4))); addLimb([end.clone().lerp(from, rr(0, 0.5)), e2], 0.018, 0.006); } continue; }
        for (let k = 0; k < 7; k++) leaves.push({ at: [end.x + rr(-0.45, 0.45), end.y + rr(-0.25, 0.35), end.z + rr(-0.45, 0.45)], size: rr(0.3, 0.55), color: leafTints[Math.floor(random() * leafTints.length)] });
        for (let k = 0; k < 4; k++) berries.push({ at: [end.x + rr(-0.5, 0.5), end.y + rr(-0.4, 0.1), end.z + rr(-0.5, 0.5)], size: rr(0.09, 0.14) });
      }
      if (!thorn) {
        for (let k = 0; k < 6; k++) leaves.push({ at: [top.x + rr(-0.5, 0.5), top.y + rr(-0.2, 0.4), top.z + rr(-0.5, 0.5)], size: rr(0.35, 0.6), color: leafTints[Math.floor(random() * leafTints.length)] });
        const leafMesh = s.scatter(new THREE.IcosahedronGeometry(1, 0), new THREE.MeshStandardMaterial({ roughness: 0.9, flatShading: true }), leaves);
        const berryMesh = s.scatter(new THREE.IcosahedronGeometry(1, 1), new THREE.MeshStandardMaterial({ color: '#c9281f', emissive: '#a01008', emissiveIntensity: mix(0.1, 0.5, mood.cheer), roughness: 0.4 }), berries);
        crown.add(leafMesh, berryMesh);
        crown.position.set(tx, 0, tz);
        leafMesh.position.set(-tx, 0, -tz);
        berryMesh.position.set(-tx, 0, -tz);
        sway.push(crown);
      }
    } else if (a.tree === 'ivy') {
      const x = hearthSide * (L / 2);
      const ivy: { at: readonly [number, number, number]; size: number; color: string }[] = [];
      for (let i = 0; i < 420; i++) {
        const z = rr(-D / 2 - 0.1, D / 2 + 0.1), top = Math.abs(z) < 0.45 ? PEAK + 0.6 : EAVE + (PEAK - EAVE) * (1 - Math.abs(z) / (D / 2));
        const y = top * (1 - random() ** 2 * 0.95);
        const outer = random() < 0.6;
        ivy.push({ at: [outer ? x + hearthSide * rr(0, 0.12) : x - hearthSide * (T + rr(0, 0.12)), y, z], size: rr(0.1, 0.22), color: ['#2f5a2c', '#3a6a30', '#274a26', '#4a7a35'][Math.floor(random() * 4)] });
      }
      s.scatter(new THREE.IcosahedronGeometry(1, 0), new THREE.MeshStandardMaterial({ roughness: 0.7, flatShading: true }), ivy);
    }

    // What was left.
    const iron = s.material(C('#2b2826').lerp(C('#7a4428'), mood.wear * 0.7), { roughness: 0.8, metalness: 0.4 });
    if (a.left === 'pot') {
      const px = hx - hearthSide * 0.5;
      s.rod([hx - hearthSide * 0.1, 0.1, -0.55], [hx - hearthSide * 0.1, 1.35, -0.55], 0.025, iron);
      s.rod([hx - hearthSide * 0.1, 1.3, -0.55], [px, 1.25, 0], 0.02, iron);
      s.rod([px, 1.25, 0], [px, 0.78, 0], 0.01, iron);
      s.lathe([[0, 0], [0.16, 0.02], [0.24, 0.16], [0.22, 0.3], [0.19, 0.34], [0.21, 0.36]], iron, [px, 0.4, 0]);
      s.ring(0.19, 0.012, [px, 0.76, 0], iron, Math.PI);
      for (let i = 0; i < 3; i++) s.rod([px + Math.cos(i * 2.1) * 0.13, 0.42, Math.sin(i * 2.1) * 0.13], [px + Math.cos(i * 2.1) * 0.17, 0.26, Math.sin(i * 2.1) * 0.17], 0.015, iron);
    } else if (a.left === 'bed') {
      const bx = -hearthSide * 1.9, bz = -D / 2 + T + 0.6;
      for (const ex of [-0.95, 0.95]) {
        const tall = ex < 0 ? 1.0 : 0.7;
        for (const ez of [-0.45, 0.45]) s.rod([bx + ex, 0.05, bz + ez], [bx + ex, tall, bz + ez], 0.022, iron);
        s.rod([bx + ex, tall, bz - 0.45], [bx + ex, tall, bz + 0.45], 0.02, iron);
        for (let k = -2; k <= 2; k++) s.rod([bx + ex, 0.4, bz + k * 0.15], [bx + ex, tall, bz + k * 0.15], 0.01, iron);
      }
      for (const ez of [-0.45, 0.45]) s.rod([bx - 0.95, 0.38, bz + ez], [bx + 0.95, 0.38 - rr(0, 0.15), bz + ez], 0.018, iron);
      for (let k = -3; k <= 3; k++) s.rod([bx + k * 0.27, 0.36, bz - 0.45], [bx + k * 0.27, 0.34, bz + 0.45], 0.008, iron);
    } else if (a.left === 'door') {
      const paint = C(mood.cheer > 0.66 ? '#b8322a' : mood.cheer > 0.33 ? '#2f6a55' : '#3d4f6a').lerp(C('#8a857a'), mood.wear * 0.6);
      const leaf = new THREE.Group();
      leaf.position.set(door[0], 0.08, D / 2 - T / 2);
      leaf.rotation.set(0, -rr(0.6, 1.2), rr(0.04, 0.14));
      s.root.add(leaf);
      for (let k = 0; k < 4; k++) { const plank = new THREE.Mesh(new THREE.BoxGeometry(0.21, 1.65 - (k === 3 ? rr(0, 0.5) : 0), 0.04), s.material(paint.clone().offsetHSL(0, 0, rr(-0.04, 0.04)), { roughness: 0.9 })); plank.position.set(0.12 + k * 0.22, 0.85, 0); plank.castShadow = true; leaf.add(plank); }
      for (const y of [0.4, 1.3]) { const ledge = new THREE.Mesh(new THREE.BoxGeometry(0.86, 0.1, 0.03), s.material(paint.clone().multiplyScalar(0.8))); ledge.position.set(0.45, y, -0.035); leaf.add(ledge); }
    } else if (a.left === 'wheel') {
      const wheel = new THREE.Group();
      wheel.position.set(3.0, 0.62, D / 2 + 0.22);
      wheel.rotation.x = -0.28;
      s.root.add(wheel);
      const timber = s.material('#77654a', { roughness: 1 });
      const rim = new THREE.Mesh(new THREE.TorusGeometry(0.58, 0.05, 6, 28, Math.PI * rr(1.4, 2)), timber);
      rim.castShadow = true;
      wheel.add(rim);
      const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.2, 10), timber);
      hub.rotation.x = Math.PI / 2;
      wheel.add(hub);
      for (let k = 0; k < 10; k++) { if (random() < 0.2) continue; const spoke = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.56, 5), timber); spoke.position.set(Math.cos(k * 0.628) * 0.3, Math.sin(k * 0.628) * 0.3, 0); spoke.rotation.z = k * 0.628 - Math.PI / 2; spoke.castShadow = true; wheel.add(spoke); }
    } else if (a.left === 'memorial') {
      const mx = 1.1, mz = D / 2 + 0.75;
      for (let k = 0; k < 4; k++) s.mesh(new THREE.DodecahedronGeometry(0.34 - k * 0.07, 0), plain, [mx + rr(-0.03, 0.03), 0.2 + k * 0.24, mz]).rotation.y = rr(0, 3);
      s.box([0.34, 0.22, 0.02], [mx, 0.42, mz + 0.3], s.material('#b9a04a', { metalness: 0.7, roughness: 0.35 })).rotation.x = -0.25;
      const cols = ['#d94a3a', '#f1c93a', '#f4f0e6', '#b05ab8'];
      for (let k = 0; k < 7; k++) s.ball([0.05, 0.05, 0.05], [mx + 0.4 + rr(-0.12, 0.12), 0.14 + rr(0, 0.08), mz + 0.25 + rr(-0.1, 0.1)], s.material(cols[k % 4], { emissive: cols[k % 4], emissiveIntensity: 0.2 }), 8);
    }

    // Surroundings.
    if (a.outside === 'ridges') {
      const ridge = new THREE.MeshStandardMaterial({ color: turf.clone().offsetHSL(0.02, 0.05, 0.03), roughness: 1 });
      for (let i = 0; i < 4; i++) { const r = s.cylinder(0.3, 0.3, L * rr(0.75, 0.95), [rr(-0.3, 0.3), 0.02, D / 2 + 1.45 + i * 0.66], ridge, 10); r.rotation.z = Math.PI / 2; r.scale.set(1, 1, 1); r.scale.x = 0.5; r.castShadow = false; }
      const under = s.box([L + 1, 0.05, 3.0], [0, 0.025, D / 2 + 2.4], new THREE.MeshStandardMaterial({ color: turf.clone().multiplyScalar(0.85), roughness: 1 }));
      under.castShadow = false;
    } else if (a.outside === 'wall') {
      const zf = D / 2 + 2.3;
      for (let x = -L / 2 - 1; x < L / 2 + 1; x += 0.6) { if (Math.abs(x - 0.4) < 0.7) continue; const h = rr(0.35, 0.9); wall(0.61, h, 0.45, x + 0.3, h / 2, zf + Math.sin(x) * 0.1); }
      for (let z = D / 2 + 0.2; z < zf; z += 0.6) { for (const x of [-L / 2 - 1, L / 2 + 1]) { const h = rr(0.3, 0.9); wall(0.45, h, 0.61, x, h / 2, z + 0.3); } }
      s.scatter(new THREE.DodecahedronGeometry(1, 0), plain, Array.from({ length: 30 }, () => ({ at: [rr(-L / 2 - 1.3, L / 2 + 1.3), 0.06, zf + rr(-0.5, 0.5)] as const, size: rr(0.09, 0.2) })));
      const yard = s.box([L + 2.4, 0.05, 2.4], [0, 0.025, D / 2 + 1.3], new THREE.MeshStandardMaterial({ color: turf, roughness: 1 }));
      yard.castShadow = false;
    } else if (a.outside === 'path') {
      const flag = s.material(base.clone().multiplyScalar(0.75), { roughness: 0.9 });
      let z = D / 2 + 0.3, x = (door[0] + door[1]) / 2;
      for (let i = 0; i < 5; i++) { const w = rr(0.55, 0.85), d = rr(0.4, 0.6); const f = s.box([w, 0.06, d], [x, 0.045, z + d / 2], flag); f.rotation.y = rr(-0.25, 0.25); z += d + rr(0.03, 0.14); x += rr(-0.12, 0.2); }
      const under = s.box([2.2, 0.04, z - D / 2], [x * 0.5 - 0.1, 0.02, (z + D / 2) / 2], new THREE.MeshStandardMaterial({ color: turf, roughness: 1 }));
      under.castShadow = false;
    }

    const wind = mix(0.004, 0.035, mood.energy), speed = mix(0.6, 3, mood.energy);
    return s.finish({
      footprint: 4.4,
      update: sway.length ? (_dt, time) => { for (const o of sway) { o.rotation.z = Math.sin(time * speed) * wind; o.rotation.x = Math.sin(time * speed * 0.7 + 1) * wind * 0.6; } } : undefined,
    });
  },
});
