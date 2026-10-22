import * as THREE from 'three';
import { choice, clamp01, defineThing, mix, noul, score } from '@conjure/kit';
import { Bag, type Tone, V, arc, dewMaterial, finish, matte, tube, xf } from './bits';

type Pair = readonly [number, number];
const FORE: Pair[] = [[0, 0], [0.3, 0.13], [0.65, 0.27], [0.92, 0.36], [1.0, 0.33], [0.97, 0.14], [0.88, -0.1], [0.78, -0.32], [0.69, -0.4], [0.45, -0.3], [0.2, -0.14]];
const HIND: Pair[] = [[0, 0], [0.3, 0.2], [0.6, 0.3], [0.85, 0.2], [0.95, -0.05], [0.86, -0.35], [0.6, -0.5], [0.3, -0.42], [0.1, -0.2]];
const TAILED: Pair[] = [[0, 0], [0.3, 0.22], [0.6, 0.26], [0.82, 0.12], [0.86, -0.15], [0.76, -0.42], [0.7, -0.75], [0.76, -1.08], [0.63, -1.06], [0.55, -0.72], [0.44, -0.46], [0.2, -0.3], [0.05, -0.12]];

const MOTHS = {
  emperor: { outline: FORE, centre: [0.55, 0.0], ground: '#9c8d82', band: '#5a473d', margin: '#dccfbe', blush: '#c4566c', eye: ['#ead9a6', '#1c1614', '#3f6fb0', '#16110f'], eyeAt: [0.6, 0.02], spots: 1 },
  hawk: { outline: HIND, centre: [0.5, -0.08], ground: '#dd8a9c', band: '#b9647a', margin: '#cfae8c', blush: '#f0b9a8', eye: ['#2a2220', '#1c1614', '#86a6d4', '#16110f'], eyeAt: [0.6, -0.2], spots: 1 },
  luna: { outline: TAILED, centre: [0.55, -0.14], ground: '#b7dba0', band: '#93b684', margin: '#ece2a2', blush: '#8a3a56', eye: ['#f0dc7a', '#1c1614', '#dc8aa2', '#2a2220'], eyeAt: [0.5, -0.08], spots: 1 },
  owl: { outline: FORE, centre: [0.55, 0.0], ground: '#56422f', band: '#2b1f18', margin: '#8d7156', blush: '#6b4d36', eye: ['#e3a22e', '#16110f', '#cfe0f0', '#16110f'], eyeAt: [0.58, 0.02], spots: 1 },
  tiger: { outline: HIND, centre: [0.5, -0.08], ground: '#ea7a28', band: '#d9601c', margin: '#f2a23a', blush: '#f4b64a', eye: ['#16110f', '#16110f', '#2f4f9a', '#16110f'], eyeAt: [0.62, -0.1], spots: 5 },
  drab: { outline: FORE, centre: [0.55, 0.0], ground: '#91887a', band: '#6a6052', margin: '#b3aa98', blush: '#857b6c', eye: ['#cfc6b2', '#6a6052', '#91887a', '#5a5146'], eyeAt: [0.56, 0.05], spots: 1 },
} as const;

export default defineThing({
  questions: {
    pattern: choice('What moth did it belong to?', {
      emperor: 'An emperor moth: grey-brown forewing with a pink flush and one bold eyespot ringed in black, blue and cream.',
      hawk: 'An eyed hawk-moth: a rosy pink hindwing with a single blue-and-black eye.',
      luna: 'A luna moth: pale green, with a long trailing tail and a small sleepy eyespot.',
      owl: 'An owl moth: dark brown with fine wavy lines and a huge orange-ringed eye.',
      tiger: 'A tiger moth: a hot orange hindwing spotted with blue-black.',
      drab: 'A plain grey-brown night moth, the kind that circles porch lights.',
    }),
    cause: choice('What happened to it?', {
      bird: 'A bird struck: a clean beak-shaped notch is missing from the edge.',
      spider: 'A spider ate the rest and discarded this, nearly whole, strung with silk.',
      lamp: 'It flew into a flame: the outer edge is singed black and curled.',
      storm: 'Rain and wind battered it: long splits run in from the margin.',
      age: 'Nothing but time: the whole edge is worn to a ragged fringe.',
    }),
    rest: choice('Where has it ended up?', {
      silk: 'Caught upright in a few threads of silk between two stems.',
      leaf: 'Lying on a broad leaf.',
      ground: 'Flat on the bare ground.',
      dangling: 'Hanging by its base from one thread, turning slowly.',
    }),
    eye: score('How big is the eyespot?', ['Barely a dot', 'A clear eye', 'A huge staring eye']),
    shed: noul('Has it shed a dusting of loose scales around itself?'),
  },

  build(a, context) {
    const { mood, random } = context;
    const root = new THREE.Group(), wingHolder = new THREE.Group(), pend = new THREE.Group();
    const plant = new Bag(), silk = new Bag(), dew = new Bag(), dust = new Bag(), fur = new Bag();
    const moth = MOTHS[a.pattern];
    const tone = (c: Tone, lift = 0) => new THREE.Color(c).offsetHSL((mood.warmth - 0.5) * 0.03, (mood.cheer - 0.5) * 0.16 - mood.wear * 0.1, lift + mood.wear * 0.03);
    const css = (c: THREE.Color, alpha = 1) => `rgba(${Math.round(c.r * 255)},${Math.round(c.g * 255)},${Math.round(c.b * 255)},${alpha})`;
    const paint = (c: Tone, alpha = 1) => css(new THREE.Color().setRGB(...(tone(c).offsetHSL(0, 0.12, -0.07).convertLinearToSRGB().toArray() as [number, number, number])), alpha);

    // The outline, read as a radius around a point inside the wing.
    const outline = new THREE.CatmullRomCurve3(moth.outline.map(([x, y]) => V(x, y, 0)), true, 'catmullrom', 0.5).getPoints(220);
    const c = V(moth.centre[0], moth.centre[1], 0);
    const radius = (angle: number) => {
      const dx = Math.cos(angle), dy = Math.sin(angle);
      let best = 0.02;
      for (let e = 0; e < outline.length - 1; e++) {
        const p = outline[e], q = outline[e + 1], ex = q.x - p.x, ey = q.y - p.y, det = ex * dy - ey * dx;
        if (Math.abs(det) < 1e-10) continue;
        const wx = p.x - c.x, wy = p.y - c.y, s = (ex * wy - ey * wx) / det, t = (dx * wy - dy * wx) / det;
        if (s > 0 && t >= 0 && t <= 1) best = Math.max(best, s);
      }
      return best;
    };
    const N = 200, K = 8;
    const baseAngle = Math.atan2(-c.y, -c.x);
    const away = (angle: number) => Math.abs(Math.atan2(Math.sin(angle - baseAngle), Math.cos(angle - baseAngle)));
    const fray = 0.025 + mood.wear * 0.07 + (a.cause === 'age' ? 0.1 : 0) + (a.cause === 'lamp' ? 0.04 : 0);
    const tailed = a.pattern === 'luna';
    const span: Pair = tailed ? [-0.55, 0.35] : [-0.95, 0.3];
    const notches: { at: number; width: number; depth: number }[] = [];
    if (a.cause === 'bird') notches.push({ at: mix(span[0], span[1], random()), width: 0.3 + random() * 0.12, depth: 0.5 + random() * 0.15 });
    if (a.cause === 'storm') for (let i = 0; i < 3; i++) notches.push({ at: mix(span[0], span[1], (i + random()) / 3), width: 0.05 + random() * 0.03, depth: 0.45 + random() * 0.35 });
    if (a.cause === 'age') notches.push({ at: mix(span[0], span[1], random()), width: 0.2, depth: 0.25 });
    for (let i = 0; i < Math.round(mood.wear * 2.4); i++) notches.push({ at: mix(span[0] - 0.8, span[1] + 0.8, random()), width: 0.05 + random() * 0.1, depth: 0.15 + random() * 0.2 });
    const phase = random() * 6;
    const rim: number[] = [];
    for (let i = 0; i < N; i++) {
      const angle = (i / N) * Math.PI * 2, weight = clamp01((away(angle) - 0.35) / 0.5);
      let r = radius(angle);
      let cut = fray * (0.55 * random() + 0.45 * (0.5 + 0.5 * Math.sin(angle * 13 + phase)));
      for (const notch of notches) {
        const off = Math.abs(Math.atan2(Math.sin(angle - notch.at), Math.cos(angle - notch.at)));
        if (off < notch.width) cut = Math.max(cut, notch.depth * (1 - off / notch.width) + random() * 0.03);
      }
      r *= 1 - cut * weight;
      // The base is where it was torn from the body: always a little ragged.
      if (weight < 1) r *= 1 - (1 - weight) * 0.06 * random();
      rim.push(r);
    }

    // The painted surface: ground colour, bands, veins, the eye, and rows of shingled scales.
    const W = 512, yLow = tailed ? -1.15 : -0.6, yHigh = 0.45, xLow = -0.05, xHigh = 1.08;
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = W;
    const ctx = canvas.getContext('2d')!;
    const px = (x: number) => ((x - xLow) / (xHigh - xLow)) * W, py = (y: number) => ((yHigh - y) / (yHigh - yLow)) * W;
    const sx = W / (xHigh - xLow), sy = W / (yHigh - yLow);
    ctx.fillStyle = paint(moth.ground);
    ctx.fillRect(0, 0, W, W);
    const ring = (d: number, width: number, colour: string, wobble: number) => {
      ctx.strokeStyle = colour; ctx.lineWidth = width; ctx.beginPath();
      for (let i = 0; i <= 60; i++) {
        const phi = mix(-2.0, 0.9, i / 60), r = d * (1 + wobble * Math.sin(phi * 17 + d * 30));
        const x = px(Math.cos(phi) * r), y = py(Math.sin(phi) * r);
        if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y);
      }
      ctx.stroke();
    };
    {
      const glow = ctx.createRadialGradient(px(0), py(0), 0, px(0), py(0), sx * 1.1);
      glow.addColorStop(0, paint(moth.blush, a.pattern === 'hawk' || a.pattern === 'tiger' ? 0.0 : 0.25));
      glow.addColorStop(0.72, paint(moth.ground, 0));
      glow.addColorStop(0.86, paint(moth.margin, 0.85));
      glow.addColorStop(1, paint(moth.margin, 0.9));
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, W, W);
    }
    if (a.pattern === 'emperor' || a.pattern === 'luna') {
      // A flush of colour along the leading edge and at the tip.
      const flush = ctx.createLinearGradient(0, py(0.42), 0, py(0.05));
      flush.addColorStop(0, paint(moth.blush, 0.85)); flush.addColorStop(1, paint(moth.blush, 0));
      ctx.fillStyle = flush; ctx.fillRect(0, 0, W, W);
    }
    ring(0.3, 5, paint(moth.band, 0.8), 0.03);
    ring(0.74, 6, paint(moth.band, 0.85), 0.035);
    ring(0.79, 3, paint(moth.margin, 0.9), 0.035);
    if (a.pattern === 'owl' || a.pattern === 'drab') for (let d = 0.18; d < 1.1; d += 0.07) ring(d, 1.5, paint(moth.band, 0.5), 0.05);
    // Veins.
    ctx.strokeStyle = paint(moth.band, 0.4); ctx.lineWidth = 1.6;
    for (let i = 0; i < 9; i++) {
      const phi = mix(tailed ? -1.5 : -0.75, 0.38, i / 8);
      ctx.beginPath(); ctx.moveTo(px(0), py(0));
      ctx.quadraticCurveTo(px(Math.cos(phi + 0.12) * 0.5), py(Math.sin(phi + 0.12) * 0.5), px(Math.cos(phi) * 1.3), py(Math.sin(phi) * 1.3));
      ctx.stroke();
    }
    // Shingled scales: row on row of little arcs, each row offset from the last.
    for (let row = 0, d = 0.06; d < 1.45; d += 0.024, row++) {
      ctx.strokeStyle = row % 2 ? 'rgba(20,14,10,0.2)' : 'rgba(255,250,235,0.16)'; ctx.lineWidth = 1.2; ctx.beginPath();
      const step = 0.026 / d;
      for (let phi = -2.0 + (row % 2) * step * 0.5; phi < 0.9; phi += step) {
        const x = px(Math.cos(phi) * d), y = py(Math.sin(phi) * d);
        ctx.moveTo(x + 5, y); ctx.arc(x, y, 5, 0, Math.PI * 2 * 0.5 + 0.4);
      }
      ctx.stroke();
    }
    // The eye.
    const eyeR = mix(0.045, 0.165, a.eye) * (a.pattern === 'luna' || a.pattern === 'drab' ? 0.6 : 1);
    const eyes: [number, number, number][] = [[moth.eyeAt[0], moth.eyeAt[1], eyeR]];
    for (let i = 1; i < moth.spots; i++) eyes.push([0.3 + random() * 0.5, -0.38 + random() * 0.5, eyeR * (0.35 + random() * 0.4)]);
    for (const [ex, ey, er] of eyes) {
      const X = px(ex), Y = py(ey), R = er * sx;
      const disc = (r: number, colour: string, dx = 0, dy = 0) => { ctx.fillStyle = colour; ctx.beginPath(); ctx.ellipse(X + dx * R, Y + dy * R, r * R, r * R * (sy / sx), 0, 0, Math.PI * 2); ctx.fill(); };
      disc(1, paint(moth.eye[0]));
      disc(0.8, paint(moth.eye[1]));
      disc(0.62, paint(moth.eye[2]), -0.05, -0.05);
      disc(0.5, paint(moth.eye[3]), 0.08, 0.08);
      if (a.pattern !== 'drab' && a.pattern !== 'tiger') disc(0.11, 'rgba(255,255,255,0.9)', -0.28, -0.3);
    }
    // Dust, and bare patches where the scales have rubbed away.
    for (let i = 0; i < 1800; i++) { ctx.fillStyle = random() < 0.5 ? 'rgba(255,250,240,0.16)' : 'rgba(25,18,12,0.16)'; ctx.fillRect(random() * W, random() * W, 2, 2); }
    for (let i = 0; i < Math.round(mood.wear * 7); i++) {
      const X = random() * W, Y = random() * W, R = 14 + random() * 40, bare = ctx.createRadialGradient(X, Y, 0, X, Y, R);
      bare.addColorStop(0, 'rgba(205,198,182,0.75)'); bare.addColorStop(1, 'rgba(205,198,182,0)');
      ctx.fillStyle = bare; ctx.fillRect(X - R, Y - R, R * 2, R * 2);
    }
    const map = new THREE.CanvasTexture(canvas);
    map.colorSpace = THREE.SRGBColorSpace;
    map.anisotropy = 4;

    // The membrane: a fan of rings out to the torn rim, gently cambered and rippled.
    const S = 0.34;
    {
      const pos: number[] = [], uv: number[] = [], col: number[] = [], idx: number[] = [];
      const curl = a.cause === 'lamp' ? 0.07 : 0.015, crumple = 0.01 + mood.wear * 0.02;
      const scorch = new THREE.Color('#15100c'), white = new THREE.Color('#ffffff'), tint = new THREE.Color();
      for (let k = 0; k <= K; k++)
        for (let i = 0; i <= N; i++) {
          const angle = (i / N) * Math.PI * 2, f = k / K, r = rim[i % N] * f;
          const x = c.x + Math.cos(angle) * r, y = c.y + Math.sin(angle) * r;
          const z = 0.07 * Math.sin(x * 2.6) + crumple * Math.sin(angle * 7 + phase) * f * f + curl * f ** 4 * (0.6 + 0.4 * Math.sin(angle * 5));
          pos.push(x * S, y * S, z * S);
          uv.push((x - xLow) / (xHigh - xLow), (y - yLow) / (yHigh - yLow));
          tint.copy(white);
          if (a.cause === 'lamp') tint.lerp(scorch, clamp01((f - 0.62) / 0.3) * clamp01((away(angle) - 0.5) / 0.6));
          col.push(tint.r, tint.g, tint.b);
        }
      for (let k = 0; k < K; k++)
        for (let i = 0; i < N; i++) {
          const p = k * (N + 1) + i, q = p + N + 1;
          idx.push(p, q, p + 1, q, q + 1, p + 1);
        }
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
      geometry.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
      geometry.setIndex(idx);
      geometry.computeVertexNormals();
      const mesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ map, vertexColors: true, side: THREE.DoubleSide, roughness: 0.95 }));
      mesh.castShadow = mesh.receiveShadow = true;
      wingHolder.add(mesh);
    }
    // A tuft of body fur still on the torn base.
    const furTone = tone(moth.ground, -0.08);
    for (let i = 0; i < 14; i++) fur.add(tube([V((random() - 0.3) * 0.03, (random() - 0.5) * 0.03, 0.004), V(-0.02 - random() * 0.025, (random() - 0.5) * 0.06, 0.01 + random() * 0.012)], (t) => mix(0.004, 0.001, t), { sides: 4 }), furTone.clone().offsetHSL(0, 0, (random() - 0.5) * 0.1));
    fur.into(wingHolder, matte({ roughness: 0.95 }));
    // Where a point of the wing ends up in wing space, for tying threads to it.
    const rimPoint = (i: number, f = 0.96) => { const angle = (i / N) * Math.PI * 2, r = rim[((i % N) + N) % N] * f; return V((c.x + Math.cos(angle) * r) * S, (c.y + Math.sin(angle) * r) * S, 0.07 * Math.sin((c.x + Math.cos(angle) * r) * 2.6) * S); };

    const green = new THREE.Color('#6f9a45').lerp(new THREE.Color('#c2a865'), mood.wear * 0.7 + (1 - mood.cheer) * 0.12);
    const line = '#8d9aa5', thread = 0.0015;
    const tuft = (x: number, n: number) => {
      for (let i = 0; i < n; i++) {
        const base = V(x + (random() - 0.5) * 0.05, 0, (random() - 0.5) * 0.05);
        plant.add(tube(arc(base, base.clone().add(V((random() - 0.5) * 0.12, 0.05 + random() * 0.08, (random() - 0.5) * 0.1)), V(0, 0.02, 0), 6), (t) => mix(0.008, 0.001, t), { sides: 5, flat: 0.2 }), green.clone().offsetHSL(0, 0, (random() - 0.5) * 0.1));
      }
    };
    const height = (tailed ? 1.5 : 0.95) * S;
    let dustAt = V(0, 0, 0), flutter = 0, spin = 0;
    const strands = (count: number) => {
      // Stray silk lying across the surface.
      for (let i = 0; i < count; i++) {
        const p = rimPoint(Math.floor(random() * N), 0.9), q = rimPoint(Math.floor(random() * N), 0.9);
        const web = new Bag().add(tube([p.clone().setZ(p.z + 0.004), p.clone().lerp(q, 0.5).setZ(0.03), q.clone().setZ(q.z + 0.004)], thread * 0.8, { sides: 4, smooth: 8 }), line);
        web.into(wingHolder, matte({ roughness: 0.5, emissive: '#56626c', emissiveIntensity: 0.25 }));
      }
    };
    if (a.rest === 'silk') {
      const reach = 0.5 * S + 0.08;
      const posts = [-reach, reach].map((x) => { const lean = (random() - 0.5) * 0.04; return arc(V(x + lean, 0, 0), V(x, height + 0.16 + random() * 0.05, 0), V(lean * 0.4, 0, 0), 10); });
      for (const post of posts) { plant.add(tube(post, (t) => mix(0.007, 0.003, t), { sides: 6 }), green); tuft(post[0].x, 4); }
      wingHolder.rotation.z = (random() - 0.5) * 0.9 + (tailed ? 0.2 : -0.2);
      wingHolder.position.set(-0.5 * S, height * 0.55 + 0.08 + (tailed ? 0.12 : 0), 0.004);
      pend.add(wingHolder);
      root.add(pend);
      pend.updateMatrixWorld(true);
      const ties = 5 + Math.round(mood.density * 4);
      for (let i = 0; i < ties; i++) {
        const p = rimPoint(Math.floor((i / ties) * N + random() * 10)).applyMatrix4(wingHolder.matrixWorld);
        const post = posts[p.x < 0 ? 0 : 1], to = post[4 + Math.floor(random() * 6)];
        silk.add(tube([p, to], thread, { sides: 4 }), line);
        if (random() < 0.4) dew.add(new THREE.SphereGeometry(1, 8, 6), null, xf(p.clone().lerp(to, 0.3 + random() * 0.5), 0.004 + random() * 0.004));
      }
      silk.add(tube([posts[0][9], posts[0][9].clone().lerp(posts[1][9], 0.5).add(V(0, -0.02, 0)), posts[1][9]], thread, { sides: 4, smooth: 10 }), line);
      strands(2 + (a.cause === 'spider' ? 4 : 0));
      flutter = 0.05;
    } else if (a.rest === 'dangling') {
      const lean = 0.2;
      const stem = new THREE.CatmullRomCurve3([V(-lean, 0, 0), V(-lean * 0.95, 0.3, 0), V(-lean * 0.6, height + 0.2, 0), V(-lean * 0.1, height + 0.27, 0), V(lean * 0.3, height + 0.22, 0)]).getPoints(24);
      plant.add(tube(stem, (t) => mix(0.008, 0.003, t), { sides: 6 }), green);
      tuft(-lean, 5);
      const anchor = stem[22];
      pend.position.copy(anchor);
      // Base up, tip down.
      wingHolder.rotation.z = -Math.PI / 2 + (tailed ? 0.9 : 0.15);
      wingHolder.position.set(0, -0.07, 0);
      pend.add(wingHolder);
      const cord = new Bag().add(tube([V(0, 0, 0), V(0, -0.07, 0)], thread, { sides: 4 }), line);
      cord.into(pend, matte({ roughness: 0.5, emissive: '#56626c', emissiveIntensity: 0.25 }));
      pend.rotation.y = random() * 1.2 - 0.6;
      root.add(pend);
      strands(a.cause === 'spider' ? 4 : 1);
      dustAt = V(anchor.x, 0, 0);
      flutter = 0.08; spin = 1;
    } else {
      const flat = new THREE.Group();
      flat.rotation.set(-Math.PI / 2 + (a.rest === 'leaf' ? 0.2 : 0.3), 0, 0);
      wingHolder.rotation.z = random() * 0.8 - 0.2;
      wingHolder.position.set(-0.5 * S, tailed ? 0.5 * S : 0.05, 0);
      flat.add(wingHolder);
      if (a.rest === 'leaf') {
        const leafTone = tone('#7d9a4a').lerp(new THREE.Color('#a8703a'), mood.wear * 0.8);
        const half = 0.62 * S + 0.1 + (tailed ? 0.08 : 0);
        const leaf = arc(V(-half, 0.006, 0.03), V(half, 0.02, -0.03), V(0, 0.012, 0), 14);
        plant.add(tube(leaf, (t) => 0.004 + half * 0.62 * Math.sin(Math.min(1, t * 1.06) * Math.PI) ** 0.7, { sides: 12, flat: 0.045, up: V(0, 1, 0) }), leafTone);
        plant.add(tube(leaf.map((p) => p.clone().add(V(0, 0.012, 0))), 0.003, { sides: 4 }), leafTone.clone().offsetHSL(0, 0, -0.1));
        for (let i = 2; i < 13; i++) for (const side of [-1, 1]) plant.add(tube([leaf[i].clone().add(V(0, 0.011, 0)), leaf[i].clone().add(V(0.03, 0.008, side * half * 0.45 * Math.sin((i / 14) * Math.PI)))], 0.0015, { sides: 3 }), leafTone.clone().offsetHSL(0, 0, -0.08));
        plant.add(tube([leaf[0], leaf[0].clone().add(V(-0.07, 0.004, 0.02))], 0.004, { sides: 5 }), leafTone.clone().offsetHSL(0, 0, -0.1));
        flat.position.y = 0.05;
        for (let i = 0; i < 4; i++) dew.add(new THREE.SphereGeometry(1, 10, 7), null, xf(V((random() - 0.5) * half * 1.5, 0.03, (random() < 0.5 ? -1 : 1) * half * (0.3 + random() * 0.15)), V(1, 0.7, 1).multiplyScalar(0.006 + random() * 0.007)));
      } else {
        flat.position.y = 0.035;
        plant.add(new THREE.DodecahedronGeometry(1, 0), tone('#8a7c6c'), xf(V(0.02, 0.012, -0.1), V(0.05, 0.03, 0.04), new THREE.Euler(0.4, 0.8, 0.2)));
        for (let i = 0; i < 9; i++) plant.add(new THREE.DodecahedronGeometry(1, 0), tone('#7a6a58', (random() - 0.5) * 0.1), xf(V((random() - 0.5) * 0.5, 0.004, (random() - 0.5) * 0.4), 0.005 + random() * 0.008, new THREE.Euler(random() * 3, random() * 3, 0)));
      }
      root.add(flat);
      strands(a.cause === 'spider' ? 5 : 0);
      flutter = 0.012;
    }
    // Loose scales: flecks in the wing's own colours.
    if (a.shed) {
      const flecks = Math.round(mix(40, 140, mood.density));
      const tones = [tone(moth.ground), tone(moth.margin), tone(moth.band), tone(moth.eye[0])];
      for (let i = 0; i < flecks; i++) {
        const angle = random() * Math.PI * 2, d = (0.03 + random() ** 0.7 * 0.24);
        dust.add(new THREE.BoxGeometry(1, 0.15, 0.6), tones[Math.floor(random() * tones.length)], xf(dustAt.clone().add(V(Math.cos(angle) * d, 0.002 + (a.rest === 'leaf' && d < 0.12 ? 0.04 : 0), Math.sin(angle) * d * 0.8)), 0.004 + random() * 0.005, new THREE.Euler(0, random() * 3, 0)));
      }
    }

    plant.into(root, matte({ roughness: 0.85 }));
    silk.into(root, matte({ roughness: 0.5, emissive: '#56626c', emissiveIntensity: 0.25 }));
    dew.into(root, dewMaterial('#cfe6f5', '#7d9c8c', 0.3));
    dust.into(root, matte({ roughness: 0.9 }));

    const turn = pend.rotation.y, tilt = wingHolder.rotation.x, pace = mix(0.4, 3, mood.energy), wind = mix(0.2, 1, mood.energy);
    return finish(root, (_dt, time) => {
      wingHolder.rotation.x = tilt + Math.sin(time * pace * 2.3) * flutter * wind;
      if (spin) pend.rotation.y = turn + Math.sin(time * pace * 0.35) * 1.1 * wind;
    }, a.rest === 'silk' || a.rest === 'dangling' ? 0.2 : undefined);
  },
});
