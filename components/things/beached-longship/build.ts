import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';

type P3 = [number, number, number];

/** Many tapered poles in one draw call. */
function rods(parent: THREE.Object3D, material: THREE.Material, list: { a: P3; b: P3; r: number; c?: string }[], taper = 1, segments = 7) {
  if (!list.length) return null;
  const mesh = new THREE.InstancedMesh(new THREE.CylinderGeometry(taper, 1, 1, segments), material, list.length);
  const up = new THREE.Vector3(0, 1, 0), q = new THREE.Quaternion(), m = new THREE.Matrix4();
  list.forEach((o, i) => {
    const a = new THREE.Vector3(...o.a), b = new THREE.Vector3(...o.b), d = b.clone().sub(a);
    const length = Math.max(d.length(), 1e-4);
    q.setFromUnitVectors(up, d.normalize());
    m.compose(a.add(b).multiplyScalar(0.5), q, new THREE.Vector3(o.r, length, o.r));
    mesh.setMatrixAt(i, m);
    mesh.setColorAt(i, new THREE.Color(o.c ?? '#ffffff'));
  });
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  mesh.castShadow = mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

const STRIPES = {
  red: ['#b3312a', '#e9dfc6'],
  blue: ['#2f5d8c', '#e6e1cf'],
  green: ['#4d7a45', '#e3c95a'],
  plain: ['#cdbf9f', '#c2b28f'],
  black: ['#26262a', '#8a2a25'],
} as const;

function sailTexture(pair: readonly [string, string], wear: number, random: () => number, sideways: boolean) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  const bands = 8;
  for (let i = 0; i < bands; i++) {
    ctx.fillStyle = pair[i % 2];
    if (sideways) ctx.fillRect(0, (i * 256) / bands, 256, 256 / bands + 1);
    else ctx.fillRect((i * 256) / bands, 0, 256 / bands + 1, 256);
  }
  // Diagonal leather reinforcing net and weather stains.
  ctx.strokeStyle = 'rgba(60,45,30,0.28)';
  ctx.lineWidth = 2;
  for (let i = -256; i < 512; i += 64) {
    ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i + 256, 256); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(i + 256, 0); ctx.lineTo(i, 256); ctx.stroke();
  }
  for (let i = 0; i < 30 * wear; i++) {
    ctx.fillStyle = `rgba(70,62,50,${0.1 + random() * 0.2})`;
    ctx.beginPath(); ctx.ellipse(random() * 256, random() * 256, 10 + random() * 30, 8 + random() * 40, random() * 3, 0, 7); ctx.fill();
  }
  if (wear > 0.55) {
    ctx.globalCompositeOperation = 'destination-out';
    for (let i = 0; i < (wear - 0.5) * 26; i++) {
      ctx.beginPath(); ctx.ellipse(random() * 256, 120 + random() * 136, 6 + random() * 16, 14 + random() * 40, random() - 0.5, 0, 7); ctx.fill();
    }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export default defineThing({
  questions: {
    fate: choice('What is the story of this ship on the beach?', {
      landed: 'Just hauled out, upright on its rollers and ready to go back down to the water.',
      'laid-up': 'Laid up for the winter under a wool tent stretched over a ridge pole amidships.',
      derelict: 'A hulk that will never sail again: planks sprung and missing, ribs showing, heeled over hard.',
      funeral: 'Made ready as a funeral ship, a shrouded bier amidships heaped round with brushwood.',
    }),
    prow: choice('What stands on the stem?', {
      dragon: 'A snarling carved dragon head with open jaws, and a curled tail at the stern.',
      serpent: 'Both stems wind up into tight carved spirals, like a coiled serpent.',
      plain: 'Tall plain stem posts, sharp and unadorned.',
      removed: 'The dragon head has been lifted off so as not to frighten the land spirits; only the socket remains.',
    }),
    sail: choice('What is the state of the mast and sail?', {
      furled: 'The sail is rolled up tight under the yard at the masthead.',
      drying: 'The big square sail hangs loose from the yard to dry, its stripes showing.',
      lowered: 'The yard and rolled sail have been lowered and lie along the ship on crutches.',
      bare: 'A bare mast and rigging: the sail is gone.',
      unstepped: 'The mast has been taken down altogether, leaving an open hull.',
    }),
    stripes: choice('If the sail shows, how is the wool striped?', {
      red: 'Blood red and undyed white, the classic raider.',
      blue: 'Woad blue and white, a rich man\'s ship.',
      green: 'Green and weld yellow, festive.',
      plain: 'Undyed greasy wool, a working ship.',
      black: 'Black with dark red, a ship of ill omen.',
    }),
    oars: choice('Where are the oars?', {
      shipped: 'Shipped and stowed in neat bundles along the thwarts.',
      out: 'Still run out through the oar ports, as if it had only just grounded.',
      scattered: 'Thrown down and scattered across the beach around the hull.',
      none: 'Gone.',
    }),
    shields: choice('What hangs along the gunwale?', {
      none: 'Nothing; a bare rail.',
      few: 'A handful of painted shields left hanging here and there.',
      full: 'A full row of bright round shields overlapping down both sides.',
    }),
    hull: choice('How is the hull finished?', {
      tarred: 'Black-brown with pine tar from keel to rail.',
      oak: 'Bare weathered oak, grey-gold.',
      painted: 'Tarred below with the top strakes painted in bright bands.',
    }),
    size: score('How big a ship is it?', ['A small six-oared boat', 'A coastal trader', 'A long warship', 'A great dragon ship of thirty benches']),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const ship = new Sculpture(context);
    s.root.add(ship.root);
    const { mood, random } = context;
    const derelict = a.fate === 'derelict';
    const L = mix(9.5, 25, a.size), h = L / 2, k = mix(0.8, 1.15, a.size);
    const B = mix(2.5, 4.9, a.size), D = mix(0.85, 1.6, a.size);
    const hb = (t: number) => (B / 2) * Math.pow(Math.max(0, 1 - Math.abs(t) ** 2.4), 0.7);
    const keelY = (t: number) => h * 0.09 * Math.abs(t) ** 3.5;
    const sheerY = (t: number) => D + h * 0.17 * Math.abs(t) ** 2.8;
    const pt = (t: number, u: number, side: number): P3 => [
      t * h * 0.93 + Math.sign(t) * Math.abs(t) ** 8 * h * 0.05 * u,
      keelY(t) + (sheerY(t) - keelY(t)) * u ** 1.6,
      side * hb(t) * u ** 0.55,
    ];

    // Clinker strakes: each plank overlaps the one below, so every seam is a small step.
    const strakes = 9, stations = 48;
    const base = new THREE.Color({ tarred: '#3b2a1e', oak: '#8d7455', painted: '#3b2a1e' }[a.hull]);
    const paints = ['#b3312a', '#d9b441', '#2f5d8c'];
    const paint = paints[Math.floor(random() * paints.length)];
    const holeChance = derelict ? mix(0.16, 0.42, mood.wear) : 0;
    const positions: number[] = [], colours: number[] = [];
    for (const side of [-1, 1])
      for (let j = 0; j < strakes; j++) {
        const tone = base.clone().offsetHSL(0, 0, (random() - 0.5) * 0.06);
        if (a.hull === 'painted' && j >= strakes - 2) tone.set(j === strakes - 1 ? paint : '#e6dcc0');
        tone.lerp(new THREE.Color('#8f8a80'), mood.wear * 0.3);
        let gone = false;
        for (let i = 0; i < stations; i++) {
          if (i % 5 === 0) gone = random() < holeChance * (0.4 + j / strakes);
          if (gone) continue;
          const t0 = -1 + (2 * i) / stations, t1 = -1 + (2 * (i + 1)) / stations;
          const quad = [t0, t1].map((t) => {
            const low = pt(t, j / strakes, side), high = pt(t, (j + 1) / strakes, side);
            const lap = 0.045 * k * Math.min(1, hb(t) * 3);
            low[2] += side * lap; low[1] -= 0.02;
            return [low, high];
          });
          const [[a0, b0], [a1, b1]] = quad;
          for (const v of [a0, a1, b0, a1, b1, b0]) { positions.push(...v); colours.push(tone.r, tone.g, tone.b); }
        }
      }
    const hullGeometry = new THREE.BufferGeometry();
    hullGeometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    hullGeometry.setAttribute('color', new THREE.Float32BufferAttribute(colours, 3));
    hullGeometry.computeVertexNormals();
    ship.mesh(hullGeometry, new THREE.MeshStandardMaterial({ vertexColors: true, side: THREE.DoubleSide, roughness: 0.82 }));

    const timber = s.material(a.hull === 'oak' ? '#7b6247' : '#4a3626');
    const pale = s.material(derelict ? '#a39a88' : '#a88a61');
    const dark = s.material('#2a2019');
    const iron = s.material('#4b4d50', { metalness: 0.5, roughness: 0.5 });

    // Keel and both stems as one sweeping timber.
    const end = (d: number): P3[] => [0.3, 0.6, 0.85, 1].map((u) => pt(d, u, 0));
    const top = (d: number): P3 => pt(d, 1, 0);
    const rise = (d: number, list: [number, number][]): P3[] => list.map(([x, y]) => [top(d)[0] + d * x * k, top(d)[1] + y * k, 0]);
    const spiral = (d: number): P3[] => {
      const c = [top(d)[0] - d * 0.25 * k, top(d)[1] + 1.25 * k];
      return Array.from({ length: 12 }, (_u, i) => {
        const angle = -0.25 * Math.PI + (i / 11) * 2.5 * Math.PI, r = mix(0.5, 0.13, i / 11) * k;
        return [c[0] + d * Math.cos(angle) * r, c[1] + Math.sin(angle) * r, 0] as P3;
      });
    };
    const tail: [number, number][] = [[0.08, 0.5], [0.02, 1.0], [-0.22, 1.4], [-0.55, 1.4], [-0.7, 1.1], [-0.52, 0.9]];
    const neck: [number, number][] = [[0.1, 0.6], [0.04, 1.3], [0.2, 2.0], [0.6, 2.3]];
    const stern = a.prow === 'dragon' ? rise(-1, tail) : a.prow === 'serpent' ? [...rise(-1, [[0.1, 0.4]]), ...spiral(-1)] : rise(-1, [[0.08, 0.6], [0.1, 1.25]]);
    const bow = a.prow === 'dragon' ? rise(1, neck) : a.prow === 'serpent' ? [...rise(1, [[0.1, 0.4]]), ...spiral(1)] : a.prow === 'plain' ? rise(1, [[0.08, 0.6], [0.1, 1.25]]) : rise(1, [[0.03, 0.22]]);
    const spine: P3[] = [
      ...stern.reverse(), ...end(-1).reverse(),
      ...Array.from({ length: 13 }, (_u, i) => { const t = -0.96 + (i / 12) * 1.92; return [t * h * 0.93, keelY(t) - 0.05, 0] as P3; }),
      ...end(1), ...bow,
    ];
    ship.tube(spine, 0.1 * k, timber);
    const bowTip = bow[bow.length - 1];
    if (a.prow === 'plain') for (const tip of [bowTip, stern[0]]) ship.cylinder(0, 0.1 * k, 0.4 * k, [tip[0], tip[1] + 0.15 * k, 0], timber, 8);
    if (a.prow === 'removed') ship.box([0.26 * k, 0.1 * k, 0.26 * k], [bowTip[0], bowTip[1] + 0.03, 0], pale);
    if (a.prow === 'dragon') {
      const head = new Sculpture(context);
      const gilt = s.material(mood.cheer > 0.45 ? '#c9a23a' : '#5a4630', { metalness: mood.cheer > 0.45 ? 0.4 : 0, roughness: 0.5 });
      head.ball([0.34, 0.24, 0.19], [0.12, 0.04, 0], gilt, 14);
      head.box([0.6, 0.11, 0.22], [0.52, 0.13, 0], gilt).rotation.z = 0.16;
      head.box([0.5, 0.08, 0.18], [0.44, -0.14, 0], gilt).rotation.z = -0.32;
      head.ball([0.09, 0.07, 0.12], [0.8, 0.24, 0], gilt, 10);
      const tooth = s.material('#efe8d2');
      for (let i = 0; i < 4; i++) for (const z of [-0.08, 0.08]) {
        head.cylinder(0, 0.025, 0.1, [0.4 + i * 0.12, 0.03 + i * 0.02, z], tooth, 6).rotation.z = Math.PI;
        head.cylinder(0, 0.022, 0.08, [0.36 + i * 0.1, -0.06 - i * 0.035, z], tooth, 6);
      }
      head.tube([[0.2, -0.05, 0], [0.5, -0.03, 0], [0.75, -0.1, 0], [0.9, 0.0, 0]], 0.03, s.material('#b3312a'));
      for (const z of [-1, 1]) {
        head.ball([0.05, 0.05, 0.03], [0.22, 0.14, z * 0.17], s.material('#f3e9c0', { emissive: '#d86a1e', emissiveIntensity: mix(0.1, 0.9, mood.energy) }), 8);
        head.rod([0.0, 0.18, z * 0.1], [-0.42, 0.5, z * 0.24], 0.055, gilt, 0.005);
      }
      for (let i = 0; i < 5; i++) head.cylinder(0, 0.06, 0.2, [-0.12 - i * 0.07, 0.1 - i * 0.2, 0], gilt, 6).rotation.z = 0.9;
      head.root.scale.setScalar(k * 1.7);
      head.root.position.set(bowTip[0], bowTip[1], 0);
      head.root.rotation.z = 0.12;
      ship.root.add(head.root);
    }

    // Ribs and thwarts.
    const benches = Math.round(mix(3, 16, a.size));
    const ribCount = benches + 4;
    for (let r = 0; r < ribCount; r++) {
      const t = -0.8 + (r / (ribCount - 1)) * 1.6;
      const us = [1.04, 0.8, 0.55, 0.3, 0.1];
      const path: P3[] = [...us.map((u) => pt(t, u, -0.94)), ...us.reverse().map((u) => pt(t, u, 0.94))];
      const curve = new THREE.CatmullRomCurve3(path.map((p) => new THREE.Vector3(...p)));
      ship.mesh(new THREE.TubeGeometry(curve, 14, 0.055 * k, 5), pale);
      if (Math.abs(t) < 0.72 && !(derelict && random() < 0.35)) {
        const seat = pt(t, 0.78, 1);
        ship.box([0.26 * k, 0.05, seat[2] * 1.9], [seat[0], seat[1], 0], pale);
      }
    }
    // A rail along the gunwale.
    for (const side of [-1, 1]) if (!derelict) ship.tube(Array.from({ length: 17 }, (_u, i) => pt(-0.97 + (i / 16) * 1.94, 1.02, side)), 0.045 * k, timber);

    // Mast, yard, sail and rigging.
    const mastH = L * 0.5, stepY = keelY(0) + 0.1;
    const pair = STRIPES[a.stripes];
    const cloth = (sideways: boolean) => new THREE.MeshStandardMaterial({ map: sailTexture(pair, mood.wear, random, sideways), side: THREE.DoubleSide, roughness: 0.95, alphaTest: 0.5 });
    const hasMast = a.sail !== 'unstepped' && !(derelict && mood.wear > 0.7);
    const yardLen = L * 0.42;
    if (hasMast) {
      ship.cylinder(0.07 * k, 0.13 * k, mastH, [0, stepY + mastH / 2, 0], pale, 10);
      ship.box([0.9 * k, 0.3 * k, 0.4 * k], [0, pt(0, 0.78, 1)[1] + 0.1, 0], timber);
      const lines: { a: P3; b: P3; r: number }[] = [];
      const head: P3 = [0, stepY + mastH * 0.97, 0];
      if (!derelict) {
        lines.push({ a: head, b: top(1), r: 0.018 }, { a: head, b: top(-1), r: 0.018 });
        for (const side of [-1, 1]) for (const x of [-0.08, 0.02]) lines.push({ a: head, b: pt(x, 1, side), r: 0.014 });
      }
      rods(ship.root, dark, lines);
      const yardY = stepY + mastH * 0.9;
      if (a.sail === 'furled' || a.sail === 'drying') {
        const rig = new Sculpture(context);
        rig.root.position.set(0.14 * k, yardY, 0);
        rig.root.rotation.y = a.sail === 'drying' ? mix(0.5, 1.0, random()) : mix(-0.2, 0.2, random());
        rig.root.rotation.x = (random() - 0.5) * 0.12;
        rig.cylinder(0.05 * k, 0.05 * k, yardLen, [0, 0, 0], pale, 8).rotation.x = Math.PI / 2;
        if (a.sail === 'furled') {
          const roll = rig.cylinder(0.2 * k, 0.2 * k, yardLen * 0.92, [0, -0.2 * k, 0], cloth(true), 10);
          roll.rotation.x = Math.PI / 2;
          roll.scale.set(1, 1, 1.25);
          for (let i = 0; i < 7; i++) rig.ring(0.21 * k, 0.018, [0, -0.2 * k, (i / 6 - 0.5) * yardLen * 0.85], dark).scale.set(1, 1.25, 1);
        } else {
          const drop = mastH * 0.62;
          const plane = new THREE.PlaneGeometry(yardLen * 0.94, drop, 14, 10);
          const at = plane.attributes.position;
          for (let i = 0; i < at.count; i++) {
            const u = at.getX(i) / (yardLen * 0.94) + 0.5, v = 0.5 - at.getY(i) / drop;
            at.setZ(i, Math.sin(u * Math.PI) * Math.sin(v * Math.PI * 0.9) * yardLen * mix(0.05, 0.16, mood.energy) + Math.sin(u * 19) * 0.04 * v);
            at.setX(i, at.getX(i) * (1 - 0.08 * v * Math.sin(v * Math.PI)));
          }
          plane.computeVertexNormals();
          const sail = rig.mesh(plane, cloth(false), [0, -drop / 2 - 0.05, 0]);
          sail.rotation.y = Math.PI / 2;
        }
        ship.root.add(rig.root);
      } else if (a.sail === 'lowered') {
        const y = pt(0, 1, 1)[1] + 0.75 * k;
        for (const x of [-yardLen * 0.36, yardLen * 0.36]) {
          ship.rod([x, pt(0, 0.4, 1)[1], 0], [x, y - 0.1, 0], 0.06 * k, pale);
          for (const z of [-1, 1]) ship.rod([x, y - 0.12, 0], [x, y + 0.22 * k, z * 0.2 * k], 0.04 * k, pale);
        }
        ship.cylinder(0.05 * k, 0.05 * k, yardLen, [0, y + 0.24 * k, 0.12 * k], pale, 8).rotation.z = Math.PI / 2;
        const roll = ship.cylinder(0.2 * k, 0.2 * k, yardLen * 0.9, [0, y + 0.08 * k, -0.04], cloth(true), 10);
        roll.rotation.z = Math.PI / 2;
      }
    }

    // Winter tent or funeral bier amidships.
    const deckY = pt(0.2, 0.78, 1)[1];
    if (a.fate === 'laid-up') {
      const x0 = -L * 0.3, x1 = L * 0.3, ridgeY = sheerY(0) + 1.9 * k;
      for (const x of [x0, x1]) for (const z of [-1, 1]) ship.rod([x, sheerY(x / h / 0.93), z * hb(x / h / 0.93) * 0.9], [x, ridgeY + 0.3 * k, -z * 0.28 * k], 0.05 * k, pale);
      ship.rod([x0 - 0.3, ridgeY, 0], [x1 + 0.3, ridgeY, 0], 0.05 * k, pale);
      const tent: number[] = [], tentColours: number[] = [];
      const dull = new THREE.Color('#a39676');
      const tentA = new THREE.Color(pair[0]).lerp(dull, 0.45), tentB = new THREE.Color(pair[1]).lerp(dull, 0.45);
      const n = 10;
      for (const z of [-1, 1]) for (let i = 0; i < n; i++) {
        const xa = mix(x0, x1, i / n), xb = mix(x0, x1, (i + 1) / n);
        const eave = (x: number): P3 => [x, sheerY(x / h / 0.93) + 0.05, z * (hb(x / h / 0.93) + 0.08)];
        const ridge = (x: number, w: number): P3 => [x, ridgeY + 0.04 - w * 0.06, 0];
        const pa = eave(xa), pb = eave(xb), ra = ridge(xa, i % 2), rb = ridge(xb, (i + 1) % 2);
        for (const v of [pa, pb, ra, pb, rb, ra]) { tent.push(...v); const c = i % 2 ? tentA : tentB; tentColours.push(c.r, c.g, c.b); }
      }
      const tentGeometry = new THREE.BufferGeometry();
      tentGeometry.setAttribute('position', new THREE.Float32BufferAttribute(tent, 3));
      tentGeometry.setAttribute('color', new THREE.Float32BufferAttribute(tentColours, 3));
      tentGeometry.computeVertexNormals();
      ship.mesh(tentGeometry, new THREE.MeshStandardMaterial({ vertexColors: true, side: THREE.DoubleSide, roughness: 1 }));
    }
    const flames: THREE.Mesh[] = [];
    if (a.fate === 'funeral') {
      const bx = hasMast ? L * 0.17 : 0;
      ship.box([2.3 * k, 0.22, 1.1 * k], [bx, deckY + 0.35, 0], pale);
      ship.ball([0.95 * k, 0.17 * k, 0.3 * k], [bx, deckY + 0.6, 0], s.material(mood.cheer > 0.5 ? '#b3312a' : '#d9d2bf'), 14);
      ship.ball([0.17 * k, 0.15 * k, 0.16 * k], [bx + 0.95 * k, deckY + 0.62, 0], s.material('#d9d2bf'), 10);
      ship.cylinder(0.36 * k, 0.36 * k, 0.04, [bx - 0.1, deckY + 0.78 * k + 0.02, 0], s.material(paint), 18);
      ship.ball([0.09 * k, 0.07 * k, 0.09 * k], [bx - 0.1, deckY + 0.8 * k + 0.03, 0], iron, 10);
      const brush: { a: P3; b: P3; r: number; c: string }[] = [];
      const twigs = Math.round(mix(40, 110, mood.density));
      for (let i = 0; i < twigs; i++) {
        const x = bx + (random() - 0.5) * L * 0.34, z = (random() - 0.5) * B * 0.6, y = deckY + random() * 0.5;
        const len = 0.5 + random() * 0.9, angle = random() * Math.PI;
        brush.push({ a: [x, y, z], b: [x + Math.cos(angle) * len, y + (random() - 0.2) * 0.6, z + Math.sin(angle) * len * 0.5], r: 0.02 + random() * 0.03, c: ['#6b5740', '#8a7556', '#4f3f2e'][i % 3] });
      }
      rods(ship.root, s.material('#ffffff'), brush, 0.5, 5);
      if (mood.energy > 0.55) {
        const fire = new THREE.MeshStandardMaterial({ color: '#ffb23a', emissive: '#ff6a12', emissiveIntensity: 1.6, transparent: true, opacity: 0.85, depthWrite: false });
        for (let i = 0; i < 9; i++) {
          const flame = new THREE.Mesh(new THREE.ConeGeometry(0.3 * k, mix(0.9, 2.4, random()) * k * mood.energy, 7), fire);
          flame.position.set(bx + (random() - 0.5) * L * 0.3, deckY + 0.9, (random() - 0.5) * B * 0.4);
          ship.root.add(flame);
          flames.push(flame);
        }
      }
    }

    // Oar ports, shields and oars.
    const benchT = (i: number) => (benches === 1 ? 0 : -0.6 + (i / (benches - 1)) * 1.2);
    const shieldColours = ['#b3312a', '#d9b441', '#2f5d8c', '#e6dcc0', '#26262a', '#4d7a45'];
    if (a.shields !== 'none' && !derelict) {
      const rim = new THREE.CylinderGeometry(0.5 * k, 0.5 * k, 0.04, 20);
      for (const side of [-1, 1]) for (let i = 0; i < benches * 2 - 1; i++) {
        if (a.shields === 'few' && random() > 0.3) continue;
        const t = -0.6 + (i / (benches * 2 - 2 || 1)) * 1.2, p = pt(t, 0.95, side);
        const disc = ship.mesh(rim, s.material(shieldColours[Math.floor(random() * shieldColours.length)]), [p[0], p[1] - 0.05, p[2] + side * (0.09 + (i % 2) * 0.035)]);
        disc.rotation.x = Math.PI / 2;
        ship.ball([0.1 * k, 0.1 * k, 0.07 * k], [p[0], p[1] - 0.05, p[2] + side * (0.14 + (i % 2) * 0.035)], iron, 8);
      }
    }
    const oarWood = s.material('#ffffff');
    const oarLen = B * 0.7 + 1.6;
    const oarList: { a: P3; b: P3; r: number; c: string }[] = [], bladeList: { a: P3; b: P3; r: number; c: string }[] = [];
    const groundOars: typeof oarList = [], groundBlades: typeof oarList = [];
    const addOar = (from: THREE.Vector3, dir: THREE.Vector3, shaft: typeof oarList, blades: typeof oarList) => {
      const tone = ['#b79a6d', '#a3875c', '#c4aa80'][Math.floor(random() * 3)];
      const tip = from.clone().addScaledVector(dir, oarLen), neckPoint = from.clone().addScaledVector(dir, oarLen * 0.78);
      shaft.push({ a: from.toArray() as P3, b: neckPoint.toArray() as P3, r: 0.05, c: tone });
      blades.push({ a: neckPoint.toArray() as P3, b: tip.toArray() as P3, r: 0.12, c: tone });
    };
    if (a.oars === 'out') for (const side of [-1, 1]) for (let i = 0; i < benches; i++) {
      const p = pt(benchT(i), 0.86, side);
      addOar(new THREE.Vector3(p[0], p[1], p[2] - side * 0.5), new THREE.Vector3(-0.12 + (random() - 0.5) * 0.25, -0.1 + (random() - 0.5) * 0.12, side).normalize(), oarList, bladeList);
    }
    if (a.oars === 'shipped') for (let i = 0; i < benches * 2; i++) {
      const side = i % 2 ? 1 : -1, y = pt(0, 0.78, 1)[1] + 0.07 + Math.floor(i / 4) * 0.06;
      addOar(new THREE.Vector3(-oarLen / 2 + (random() - 0.5) * 0.5, y, side * (B * 0.2 + ((i >> 1) % 3) * 0.09)), new THREE.Vector3(1, 0, (random() - 0.5) * 0.03).normalize(), oarList, bladeList);
    }
    if (a.oars === 'scattered') for (let i = 0; i < benches * 2; i++) {
      const side = random() < 0.5 ? -1 : 1, angle = random() * Math.PI * 2;
      const start = new THREE.Vector3((random() - 0.5) * L * 0.8, 0.05 + random() * 0.05, side * (B * 0.5 + 0.4 + random() * 1.1));
      addOar(start, new THREE.Vector3(Math.cos(angle), 0, Math.sin(angle) * 0.5).normalize(), groundOars, groundBlades);
    }
    rods(ship.root, oarWood, oarList, 0.8, 6);
    const flat = (mesh: THREE.InstancedMesh | null) => mesh;
    flat(rods(ship.root, oarWood, bladeList, 0.5, 4));
    rods(s.root, oarWood, groundOars, 0.8, 6);
    rods(s.root, oarWood, groundBlades, 0.5, 4);

    // Sit the hull on its rollers, heeled to one side, with shores to hold it.
    const rollerR = 0.17 * k;
    const heelSide = random() < 0.5 ? -1 : 1;
    const heel = heelSide * (derelict ? mix(0.2, 0.36, mood.wear) : mix(0.02, 0.12, random()));
    ship.root.position.y = derelict ? -0.12 : rollerR * 2 + 0.03;
    ship.root.rotation.x = heel;
    ship.root.rotation.z = derelict ? 0.02 : mix(0.0, 0.03, random());
    const logs: { a: P3; b: P3; r: number; c: string }[] = [];
    if (!derelict) {
      const count = Math.round(mix(3, 6, a.size));
      for (let i = 0; i < count; i++) {
        const x = (i / (count - 1) - 0.5) * L * 0.5 + (random() - 0.5) * 0.4, skew = (random() - 0.5) * 0.5, half = B * 0.45 + random() * 0.4;
        logs.push({ a: [x - skew, rollerR, -half], b: [x + skew, rollerR, half], r: rollerR, c: ['#8f7a5c', '#7a664b', '#a08a69'][i % 3] });
      }
      for (let i = 0; i < 2; i++) {
        const x = L * 0.5 + 0.2 + i * (0.7 + random() * 0.5), skew = (random() - 0.5) * 0.9;
        logs.push({ a: [x - skew, rollerR, -B * 0.4], b: [x + skew, rollerR, B * 0.4], r: rollerR, c: '#8f7a5c' });
      }
      ship.root.updateMatrixWorld(true);
      for (const side of [-1, 1]) for (const t of [-0.45, 0.45]) {
        const hold = new THREE.Vector3(...pt(t, 0.7, side)).applyMatrix4(ship.root.matrixWorld);
        logs.push({ a: [hold.x + (random() - 0.5) * 0.4, 0, hold.z + side * (0.9 + random() * 0.5)], b: [hold.x, hold.y, hold.z], r: 0.07 * k, c: '#a08a69' });
      }
    } else {
      // Fallen planks lie in the stones beside the wreck.
      for (let i = 0; i < 6; i++) {
        const x = (random() - 0.5) * L * 0.7, z = heelSide * (B * 0.5 + 0.3 + random() * 1.6), len = 1 + random() * 2;
        const plank = s.box([len, 0.04, 0.24], [x, 0.03, z], s.material('#7d7466'));
        plank.rotation.y = (random() - 0.5) * 1.2;
      }
    }
    rods(s.root, s.material('#ffffff'), logs, 0.92, 9);

    return s.finish({
      footprint: L * 0.5,
      update: flames.length ? (_dt, time) => flames.forEach((flame, i) => flame.scale.set(1, 1 + Math.sin(time * (6 + i) + i) * 0.25, 1)) : undefined,
    });
  },
});
