import * as THREE from 'three';
import { NATURAL_FRAMING, type Placeable, choice, defineWorld, diorama, mix, visibleBounds } from '@conjure/kit';
import { Bag, TAU, V, arc, blob, dewMaterial, field, instances, leaf, matte, paint, tube, xf } from './bits';

/** World units per metre. The nest, 4.5 cm across, is drawn about six units wide. */
const U = 1 / 0.0075;

interface Slot { x: number; y: number; z: number; r: number; h: number; turn: number }
interface LeafSpec { at: THREE.Vector3; dir: THREE.Vector3; length: number; width: number; fold: number; droop: number; roll?: number; tint?: THREE.Color }

/** The same surface the kit's `leaf` geometry draws, for putting dew and things on a leaf. */
function leafSurface(spec: LeafSpec, t: number, s: number) {
  const half = spec.width * 0.5 * Math.pow(Math.sin(Math.PI * Math.pow(t, 0.85)), 0.8);
  const local = V(s * half, Math.abs(s) * half * spec.fold - spec.droop * spec.length * t * t, t * spec.length);
  return local.applyMatrix4(leafMatrix(spec));
}

/** Lay a leaf from its stalk along `dir`, its face kept as close to the sky as the direction allows. */
function leafMatrix(spec: LeafSpec) {
  const z = spec.dir.clone().normalize();
  const x = V(0, 1, 0).cross(z);
  if (x.lengthSq() < 1e-6) x.set(1, 0, 0);
  x.normalize();
  const y = z.clone().cross(x).normalize();
  const m = new THREE.Matrix4().makeBasis(x, y, z);
  if (spec.roll) m.multiply(new THREE.Matrix4().makeRotationZ(spec.roll));
  return m.setPosition(spec.at);
}

/** A ragged lobed flake, flat in xz. */
function lichenFlake(random: () => number) {
  const shape = new THREE.Shape();
  const lobes = 6;
  for (let i = 0; i <= 18; i++) {
    const a = (i / 18) * TAU, r = 0.82 + 0.16 * Math.cos(a * lobes) + (random() - 0.5) * 0.12;
    if (i === 0) shape.moveTo(Math.cos(a) * r, Math.sin(a) * r);
    else shape.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  const g = new THREE.ShapeGeometry(shape);
  g.rotateX(-Math.PI / 2);
  return g;
}

const hex = (c: THREE.Color) => `#${c.getHexString()}`;

export default defineWorld({
  questions: {
    contents: choice('What is the nest holding now?', {
      eggs: 'Freshly finished and being incubated: a neat, tight cup with a soft new lining.',
      nestlings: 'Growing chicks: the cup stretched wide and shallow by their bodies, droppings streaked on the leaves below.',
      empty: 'Built and waiting, perfect and empty, a fresh tuft of down still on the rim.',
      fledged: 'The young have flown: the cup trampled flat and frayed, a lost pinfeather on the rim, the season over.',
    }),
    support: choice('What is the nest built on?', {
      twig: 'A forked twig of a tree, among leaves.',
      clothesline: 'A sagging clothesline wire in a back garden, wooden pegs along it.',
      chain: 'A loop of the chain that hangs a glass lantern on a porch.',
      cactus: 'Between the pads of a prickly pear cactus, guarded by spines.',
    }),
    season: choice('What season is it?', {
      spring: 'Spring: pale new leaves and blossom.',
      summer: 'High summer: deep green and full.',
      autumn: 'Autumn: leaves turning gold and rust, a late brood.',
      winter: 'A mild winter: bare twigs and a few brown leaves hanging on.',
    }),
    weather: choice('What is the air like?', {
      dew: 'A clear still dawn, dew beaded on everything.',
      mist: 'Soft white mist, the world behind gone pale.',
      rain: 'Just after rain: heavy drops hanging from every edge, a grey sky.',
      frost: 'A cold snap: frost crystals instead of dew, the light blue and thin.',
      golden: 'Low golden sun flaring through, warm and bright.',
    }),
    behind: choice('What is blurred in the distance behind?', {
      canopy: 'The soft green blur of a tree canopy with light breaking through.',
      sky: 'Open dawn sky, pink and gold, a few soft clouds.',
      garden: 'A garden out of focus: round blurs of flower colour.',
      porch: 'The pale blurred wall and dark window of a house.',
    }),
    visitor: choice('What visitor or threat is near the nest?', {
      none: 'Nothing: all is calm.',
      ants: 'A line of ants marching along toward the nest.',
      spider: 'A small spider letting itself down on a thread above the rim.',
      hawk: 'The dark shape of a hawk circling far off in the sky.',
      wasp: 'A paper wasp hovering close, inspecting.',
    }),
  },

  build(a, context) {
    const { mood, random } = context;
    const noise = field(random);

    // ---- Sky and light.
    const dawn = 1 - Math.min(1, Math.abs(mood.daylight - 0.5) * 2);
    let top = new THREE.Color('#9fbbd8').lerp(new THREE.Color('#bcd2e6'), dawn);
    let middle = new THREE.Color('#f4c4a6').lerp(new THREE.Color('#dfe6ea'), dawn * 0.7);
    let bottom = new THREE.Color('#f2d9c2').lerp(new THREE.Color('#e6ead8'), dawn * 0.6);
    if (mood.daylight > 0.7) { middle.lerp(new THREE.Color('#e9a27e'), (mood.daylight - 0.7) * 2); top.lerp(new THREE.Color('#9c8fb8'), (mood.daylight - 0.7) * 1.5); }
    const weatherTint = { dew: null, mist: '#e6e7e3', rain: '#a8b0b6', frost: '#dbe6f0', golden: '#f4c47e' }[a.weather];
    if (weatherTint) {
      const w = new THREE.Color(weatherTint), amount = a.weather === 'golden' ? 0.55 : 0.6;
      top = top.lerp(w, amount); middle = middle.lerp(w, amount * 0.8); bottom = bottom.lerp(w, amount * 0.7);
    }
    const warmShift = (mood.warmth - 0.5) * 0.12;
    for (const c of [top, middle, bottom]) c.offsetHSL(warmShift * 0.1, 0, 0);

    const { art, world } = diorama(context, { background: hex(middle), floor: null, width: 20, depth: 14, pitch: 46, yaw: 24 });
    const root = art.root;

    // ---- The nest cup.
    const [sx, sy] = { eggs: [1, 1], nestlings: [1.1, 0.86], empty: [1, 1], fledged: [1.18, 0.74] }[a.contents];
    const fray = mix(0.6, 1.8, mood.wear) * (a.contents === 'fledged' ? 1.8 : 1);
    const profile: [number, number][] = [[0.25, -0.95], [1.4, -0.72], [2.3, -0.1], [2.85, 0.8], [3.05, 1.8], [3.0, 2.5], [2.75, 2.95], [2.4, 3.12], [2.05, 2.97], [1.95, 2.6], [1.85, 2.2], [1.4, 1.85], [0.6, 1.75], [0.02, 1.75]];
    const shape = profile.map(([r, y]) => [r * sx, y * (y > 0 ? sy : 1)] as [number, number]);
    const rim = 3.12 * sy, floorY = 1.75 * sy;
    const outer = (y: number) => {
      for (let i = 0; i < 7; i++) {
        const [r0, y0] = shape[i], [r1, y1] = shape[i + 1];
        if (y >= y0 && y <= y1) return r0 + ((r1 - r0) * (y - y0)) / (y1 - y0 || 1);
      }
      return 2.6 * sx;
    };
    const cup = new THREE.LatheGeometry(shape.map(([r, y]) => new THREE.Vector2(r, y)), 64);
    {
      const pos = cup.getAttribute('position'), p = V();
      for (let i = 0; i < pos.count; i++) {
        p.fromBufferAttribute(pos, i);
        const push = 1 + noise(p, 0.9) * 0.045 * (1 + mood.wear);
        // A fledged nest's rim sags and tears in places.
        const sag = a.contents === 'fledged' && p.y > rim * 0.8 ? Math.min(0, noise(p.clone().multiplyScalar(0.7), 1)) * 0.5 : 0;
        pos.setXYZ(i, p.x * push, p.y + sag, p.z * push);
      }
      cup.computeVertexNormals();
    }
    const felt = new THREE.Color('#5f5c48').lerp(new THREE.Color('#7f786a'), mood.wear * 0.5);
    const down = new THREE.Color('#ece3cf'), downShade = new THREE.Color('#c2b59b');
    paint(cup, (q, n) => {
      const radial = (q.x * n.x + q.z * n.z) / (Math.hypot(q.x, q.z) || 1);
      const inside = radial < -0.15 || (q.y > rim - 0.35 && n.y > 0.55);
      return inside ? down.clone().lerp(downShade, Math.max(0, 0.7 - n.y) * 0.6) : felt.clone().lerp(new THREE.Color('#5a5446'), Math.max(0, -n.y) * 0.6 + Math.max(0, noise(q, 3)) * 0.2);
    });
    const nestBag = new Bag();
    nestBag.add(cup);
    // A soft mound of down lining the floor.
    const nestMesh = nestBag.into(root, matte({ roughness: 0.95 }));
    // The mound of down on the floor; place() raises it under a small hero so it sits up in view.
    const moundBag = new Bag();
    moundBag.add(paint(blob(V(1.8 * sx, 1, 1.8 * sx), noise, 0.1, 1.5, 28, 12), (_q, n) => down.clone().lerp(downShade, Math.max(0, 0.5 - n.y) * 0.8)));
    const mound = moundBag.into(nestMesh ?? root, matte({ roughness: 0.95 }))!;
    mound.position.y = floorY - 0.3;
    mound.scale.y = 0.62;
    world.ground = nestMesh;

    // Lichen shingles on the outside.
    const flakes: { matrix: THREE.Matrix4; colour: string }[] = [];
    const lichen = ['#86ab92', '#6d967f', '#9cb88a', '#55806f', '#b3c49c', '#7894a0', '#c9d2b4'].map((c) => new THREE.Color(c).lerp(new THREE.Color('#a8a08a'), mood.wear * 0.4));
    const flakeCount = Math.round(mix(190, 280, mood.density) * (a.contents === 'fledged' ? 0.7 : 1));
    for (let i = 0; i < flakeCount; i++) {
      const y = -0.75 + random() * (rim - 0.45 + 0.75), angle = random() * TAU, r = outer(y) + 0.05;
      const n = V(Math.cos(angle), 0.3 + (y < 0.2 ? -0.5 : 0), Math.sin(angle)).normalize();
      const q = new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), n).multiply(new THREE.Quaternion().setFromAxisAngle(V(0, 1, 0), random() * TAU));
      const size = 0.34 + random() * 0.3;
      flakes.push({ matrix: new THREE.Matrix4().compose(V(Math.cos(angle) * r, y, Math.sin(angle) * r), q, V(size, size, size)), colour: hex(lichen[Math.floor(random() * lichen.length)]) });
    }

    // Bark shreds and plant fibres felted into the outside.
    const shreds = new Bag();
    for (let i = 0; i < 60; i++) {
      const y = -0.6 + random() * (rim - 0.3), angle = random() * TAU, r = outer(y) + 0.06;
      const from = V(Math.cos(angle) * r, y, Math.sin(angle) * r);
      const along = V(-Math.sin(angle), (random() - 0.5) * 0.8, Math.cos(angle)).normalize().multiplyScalar(0.5 + random() * 0.8);
      shreds.add(tube([from, from.clone().add(along)], 0.035, { sides: 3 }), random() < 0.5 ? '#7a5e40' : '#a08a62');
    }
    // Silk binding round the walls, rim fibres of down.
    const silk = new Bag();
    for (let i = 0; i < 10; i++) {
      const y0 = -0.3 + random() * (rim - 0.6), tilt = (random() - 0.5) * 1.2, phase = random() * TAU, sweep = 2.2 + random() * 3.5;
      const pts: THREE.Vector3[] = [];
      for (let k = 0; k <= 36; k++) {
        const angle = phase + (k / 36) * sweep, y = y0 + Math.sin(angle) * tilt * 0.5;
        const r = outer(Math.min(rim - 0.3, Math.max(-0.6, y))) + 0.13;
        pts.push(V(Math.cos(angle) * r, y, Math.sin(angle) * r));
      }
      silk.add(tube(pts, 0.022, { sides: 3 }), '#ffffff');
    }
    const fibres = new Bag();
    for (let i = 0; i < Math.round(80 * fray); i++) {
      const angle = random() * TAU, r = 2.25 * sx + (random() - 0.5) * 0.4;
      const from = V(Math.cos(angle) * r, rim - 0.05 + random() * 0.08, Math.sin(angle) * r);
      const out = V(Math.cos(angle + (random() - 0.5)), (random() - 0.1) * 0.7, Math.sin(angle + (random() - 0.5))).multiplyScalar((0.35 + random() * 0.55) * Math.min(1.6, fray));
      fibres.add(tube(arc(from, from.clone().add(out), V(0, 0.12 * random(), 0), 4), 0.018, { sides: 3 }), random() < 0.5 ? '#f3ecdb' : '#d8ccb2');
    }
    if (a.contents === 'empty') {
      // A fresh tuft of down left on the rim.
      const at = V(Math.cos(2.3) * 2.3, rim + 0.15, Math.sin(2.3) * 2.3);
      fibres.add(paint(blob(V(0.45, 0.3, 0.4), noise, 0.3, 4, 12, 8), () => '#f6f1e4'), null, xf(at));
      for (let i = 0; i < 40; i++) {
        const dir = V(random() - 0.5, random() * 0.6, random() - 0.5).normalize();
        fibres.add(tube(arc(at, at.clone().addScaledVector(dir, 0.5 + random() * 0.5), V(0, 0.1, 0), 4), 0.016, { sides: 3 }), '#f6f1e4');
      }
    }
    const rimExtras = new Bag();
    if (a.contents === 'fledged') {
      // A lost pinfeather and a shard of shell on the rim.
      const at = V(Math.cos(0.6) * 2.4 * sx, rim + 0.05, Math.sin(0.6) * 2.4 * sx);
      rimExtras.add(leaf(1.6, 0.55, { fold: -0.1, droop: 0.1, tip: 0.7, colour: (t) => new THREE.Color('#3f7a50').lerp(new THREE.Color('#c9c3b0'), Math.max(0, 0.35 - t) * 2.6) }), null, xf(at, 1, new THREE.Euler(0.15, 2.1, 0.1)));
      rimExtras.add(tube([at.clone().add(V(0.3, -0.02, 0.3)), at.clone().add(V(-0.9, 0.05, -0.6))], 0.03, { sides: 4 }), '#d6d0bf');
      const shard = new THREE.SphereGeometry(0.5, 10, 6, 0, 1.4, 0, 1.1);
      rimExtras.add(shard, '#f3f0e8', xf(V(Math.cos(3.6) * 2.35 * sx, rim, Math.sin(3.6) * 2.35 * sx), 1, new THREE.Euler(2.6, 0.4, 0)));
    }

    // ---- The support, its leaves and its slots.
    const supportBag = new Bag();
    const leafSpecs: LeafSpec[] = [];
    const slots: Slot[] = [];
    const dewPoints: { at: THREE.Vector3; size: number; hang?: boolean }[] = [];
    const extra = new Bag();
    const glowBag = new Bag();
    const seasonLeaf = (index: number) => {
      if (a.season === 'spring') return new THREE.Color('#8dc15a').lerp(new THREE.Color('#a9cf6a'), random() * 0.4);
      if (a.season === 'summer') return new THREE.Color('#4a8634').lerp(new THREE.Color('#3a6e2a'), random() * 0.5);
      if (a.season === 'autumn') return new THREE.Color(['#d99a2b', '#c9622a', '#b8452a', '#e0b63a', '#8f9a36'][index % 5]);
      return new THREE.Color('#8a6a44').lerp(new THREE.Color('#a07a4c'), random() * 0.5);
    };
    const leafCount = a.season === 'winter' ? 3 : Math.round(mix(7, 11, mood.density));
    const bark = a.season === 'winter' ? '#7a7066' : '#6f5c47';
    const barkTube = (curve: THREE.Curve<THREE.Vector3>, r0: number, r1: number) =>
      supportBag.add(tube(curve.getSpacedPoints(40), (t) => mix(r0, r1, t), { sides: 12, colour: (t) => new THREE.Color(bark).lerp(new THREE.Color('#9a8a74'), 0.35 * Math.sin(t * 61) ** 2).lerp(new THREE.Color('#4f4336'), 0.2 * Math.sin(t * 23 + 1) ** 2) }));
    let antPath: THREE.Vector3[] = [];

    if (a.support === 'twig') {
      const main = new THREE.CatmullRomCurve3([V(-13, -3.4, -3.8), V(-6.5, -1.7, -1.5), V(0, -0.5, 0.15), V(5.5, 0.15, 1.7), V(12, 0.5, 3.2)]);
      const forkA = new THREE.CatmullRomCurve3([main.getPointAt(0.56), V(3.6, 1.6, -1.5), V(6.5, 3.6, -4.2), V(9.5, 4.6, -6.8)]);
      const forkB = new THREE.CatmullRomCurve3([main.getPointAt(0.24), V(-7.6, 0.6, -4), V(-9, 3.2, -7.5)]);
      barkTube(main, 0.46, 0.24);
      barkTube(forkA, 0.24, 0.1);
      barkTube(forkB, 0.26, 0.11);
      // Buds and leaf scars along the bark.
      for (const t of [0.12, 0.36, 0.72, 0.9]) supportBag.add(new THREE.SphereGeometry(1, 8, 6), bark, xf(main.getPointAt(t), mix(0.46, 0.24, t) * 1.3));
      // Silk lashing the nest to the twig.
      for (let i = 0; i < 9; i++) {
        const t = 0.44 + (i / 8) * 0.22, p = main.getPointAt(t);
        const angle = (i / 8) * Math.PI + Math.PI * 0.5;
        silk.add(tube([p.clone().add(V(0, -0.45, 0)), V(Math.cos(angle) * 1.8, -0.55 + random() * 0.4, Math.sin(angle) * 1.8)], 0.02, { sides: 3 }), '#ffffff');
      }
      const ends: LeafSpec[] = [];
      const along = (curve: THREE.CatmullRomCurve3, t: number, side: number, length: number, flat = false): LeafSpec => {
        const at = curve.getPointAt(t), tangent = curve.getTangentAt(t);
        const sideways = V(0, 1, 0).cross(tangent).normalize().multiplyScalar(side);
        const dir = tangent.clone().multiplyScalar(0.55).add(sideways).add(V(0, flat ? 0.02 : -0.2 + random() * 0.3, 0)).normalize();
        return { at, dir, length, width: length * 0.48, fold: 0.18, droop: flat ? 0.03 : 0.1 + random() * 0.1 };
      };
      // Two broad, nearly flat leaves in front to either side carry the supporting cast.
      const rightLeaf: LeafSpec = { at: main.getPointAt(0.78), dir: V(0.32, 0.03, 1).normalize(), length: 8, width: 4.6, fold: 0.1, droop: 0.02 };
      const leftLeaf: LeafSpec = { at: main.getPointAt(0.3), dir: V(-0.45, 0.06, 1).normalize(), length: 7.5, width: 4.3, fold: 0.1, droop: 0.02 };
      ends.push(rightLeaf, leftLeaf);
      const pool: LeafSpec[] = [along(forkA, 0.4, 1, 7), along(forkA, 0.7, -1, 7.5), along(forkA, 1, 1, 6.5), along(forkB, 0.55, -1, 7), along(forkB, 1, 1, 6.5), along(main, 0.95, 1, 6), along(main, 0.08, -1, 6.5), along(forkA, 0.85, 1, 6), along(forkB, 0.8, -1, 6)];
      const chosen = a.season === 'winter' ? [pool[2], pool[4], rightLeaf] : [...ends, ...pool.slice(0, Math.max(0, leafCount - 2))];
      leafSpecs.push(...chosen);
      for (const spec of [rightLeaf, leftLeaf]) {
        if (!chosen.includes(spec)) continue;
        const p = leafSurface(spec, 0.56, 0);
        slots.push({ x: p.x, y: p.y + 0.05, z: p.z, r: 2.4, h: 6, turn: 0.4 });
      }
      const twigTop = main.getPointAt(0.12);
      slots.push({ x: twigTop.x, y: twigTop.y + 0.5, z: twigTop.z, r: 2, h: 5, turn: 0.6 });
      const forkTop = forkA.getPointAt(0.62);
      slots.push({ x: forkTop.x, y: forkTop.y + 0.25, z: forkTop.z, r: 1.8, h: 4.5, turn: 0.2 });
      antPath = Array.from({ length: 12 }, (_u, i) => main.getPointAt(0.12 + i * 0.026).add(V(0, mix(0.46, 0.24, 0.12 + i * 0.026), 0)));
      for (let i = 0; i < 18; i++) {
        const t = random(), p = main.getPointAt(t);
        dewPoints.push({ at: p.add(V(0, -mix(0.46, 0.24, t) - 0.12, 0)), size: 0.2 + random() * 0.16, hang: true });
      }
      if (a.season === 'spring')
        for (let i = 0; i < 5; i++) {
          const at = [forkA.getPointAt(0.55), forkB.getPointAt(0.7), main.getPointAt(0.9), forkA.getPointAt(0.95), main.getPointAt(0.05)][i].add(V(0, 0.35, 0));
          for (let k = 0; k < 5; k++) {
            const angle = (k / 5) * TAU;
            extra.add(paint(blob(V(0.42, 0.08, 0.3), null), () => (i % 2 ? '#fbeef2' : '#f7f4ee')), null, xf(at.clone().add(V(Math.cos(angle) * 0.38, 0, Math.sin(angle) * 0.38)), 1, new THREE.Euler(0.15, -angle, 0)));
          }
          extra.add(new THREE.SphereGeometry(0.18, 8, 6), '#f0c040', xf(at.clone().add(V(0, 0.08, 0))));
        }
    } else if (a.support === 'clothesline') {
      const wire = new THREE.CatmullRomCurve3([V(-14, 2.4, -3.4), V(-7, 0.2, -1.6), V(0, -0.5, 0.1), V(7, 0.5, 1.8), V(14, 2.8, 3.6)]);
      supportBag.add(tube(wire.getSpacedPoints(60), 0.12, { sides: 8 }), '#8d9396');
      const peg = (t: number, turn: number) => {
        const at = wire.getPointAt(t);
        const m = xf(at, 1, new THREE.Euler(0, turn, 0));
        for (const s of [-1, 1]) {
          const prong = new THREE.BoxGeometry(0.42, 3.6, 0.3);
          prong.translate(0, 0.7, 0);
          supportBag.add(prong, '#c8a26e', m.clone().multiply(xf(V(s * 0.24, 0, 0), 1, new THREE.Euler(0, 0, s * 0.06))));
        }
        supportBag.add(new THREE.TorusGeometry(0.3, 0.05, 6, 16), '#b8bec2', m.clone().multiply(xf(V(0, 0.55, 0), 1, new THREE.Euler(0, Math.PI / 2, 0))));
        return at.clone().add(V(0, 2.55, 0));
      };
      const p1 = peg(0.22, 0.3), p2 = peg(0.76, -0.2);
      slots.push({ x: p2.x, y: p2.y, z: p2.z, r: 1.5, h: 4.5, turn: 0.3 }, { x: p1.x, y: p1.y, z: p1.z, r: 1.5, h: 4.5, turn: 0.5 });
      // A tea towel hung over the line at the left, striped.
      const towelAt = wire.getPointAt(0.08);
      const towel = new THREE.PlaneGeometry(4.2, 5.5, 8, 10);
      const tp = towel.getAttribute('position');
      for (let i = 0; i < tp.count; i++) tp.setZ(i, Math.sin(tp.getX(i) * 1.3 + tp.getY(i) * 0.4) * 0.25);
      towel.computeVertexNormals();
      paint(towel, (q) => (Math.abs(q.y + 1.8) < 0.3 || Math.abs(q.x) > 1.8 ? '#b8473a' : '#eee8da'));
      supportBag.add(towel, null, xf(towelAt.clone().add(V(0, -2.6, 0.05)), 1, new THREE.Euler(0, 0.35, 0)));
      // The post the line is tied to, at the back right, with ivy climbing it.
      const post = V(11.5, -4, -3);
      supportBag.add(new THREE.BoxGeometry(1.1, 12, 1.1), '#7a6650', xf(post.clone().add(V(0, 4.5, 0))));
      supportBag.add(tube([wire.getPointAt(0.98), post.clone().add(V(0, 9.6, 0.55))], 0.12, { sides: 6 }), '#8d9396');
      slots.push({ x: post.x, y: post.y + 10.5, z: post.z, r: 1.6, h: 5, turn: 0 });
      for (let i = 0; i < Math.round(leafCount * 0.7); i++) {
        const y = post.y + 3 + i * 0.9, angle = random() * TAU;
        leafSpecs.push({ at: post.clone().add(V(Math.cos(angle) * 0.6, y - post.y, Math.sin(angle) * 0.6 + 0.4)), dir: V(Math.cos(angle), -0.3, Math.sin(angle) + 0.6).normalize(), length: 3.4, width: 3.2, fold: 0.15, droop: 0.12 });
      }
      for (let i = 0; i < 26; i++) {
        const t = random();
        dewPoints.push({ at: wire.getPointAt(t).add(V(0, -0.3, 0)), size: 0.18 + random() * 0.22, hang: true });
      }
      antPath = Array.from({ length: 12 }, (_u, i) => wire.getPointAt(0.25 + i * 0.018).add(V(0, 0.17, 0)));
    } else if (a.support === 'chain') {
      // A porch beam above, a chain swagged down through the nest and up to a hanging lantern.
      supportBag.add(new THREE.BoxGeometry(30, 1.4, 1.6), '#8a7258', xf(V(0, 10.5, -6)));
      // A porch rail along the front left, its top a place to stand.
      supportBag.add(new THREE.BoxGeometry(12, 0.7, 1.0), '#9a8266', xf(V(-9, -3.2, 3.6)));
      supportBag.add(new THREE.BoxGeometry(0.9, 6, 0.9), '#8a7258', xf(V(-4.2, -6.5, 3.6)));
      const chain = new THREE.CatmullRomCurve3([V(-10, 9.8, -5.6), V(-6.5, 3.2, -2.6), V(0, -0.55, 0.1), V(5, 2.4, 1.4), V(8.2, 6.4, 2.2)]);
      const length = chain.getLength(), links = Math.floor(length / 0.62);
      for (let i = 0; i < links; i++) {
        const t = i / links, at = chain.getPointAt(t), tangent = chain.getTangentAt(t);
        const q = new THREE.Quaternion().setFromUnitVectors(V(1, 0, 0), tangent).multiply(new THREE.Quaternion().setFromAxisAngle(V(1, 0, 0), i % 2 ? Math.PI / 2 : 0));
        const link = new THREE.TorusGeometry(0.36, 0.085, 6, 14);
        link.scale(1.35, 1, 1);
        supportBag.add(link, '#3f3a36', new THREE.Matrix4().compose(at, q, V(1, 1, 1)));
      }
      // The lantern: cap, glass box with a candle glow, base.
      const lantern = V(8.2, 6.4, 2.2);
      supportBag.add(tube([lantern, lantern.clone().add(V(0, -1.1, 0))], 0.08, { sides: 5 }), '#3f3a36');
      const body = lantern.clone().add(V(0, -1.1, 0));
      supportBag.add(new THREE.ConeGeometry(1.7, 1.2, 4), '#2f2b28', xf(body.clone().add(V(0, -0.6, 0)), 1, new THREE.Euler(0, Math.PI / 4, 0)));
      supportBag.add(new THREE.BoxGeometry(2.4, 0.35, 2.4), '#2f2b28', xf(body.clone().add(V(0, -4.8, 0))));
      for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) supportBag.add(new THREE.BoxGeometry(0.16, 3.6, 0.16), '#2f2b28', xf(body.clone().add(V(dx * 1.1, -2.9, dz * 1.1))));
      const glass = new THREE.Mesh(new THREE.BoxGeometry(2.1, 3.5, 2.1), new THREE.MeshStandardMaterial({ color: '#dfe8e6', transparent: true, opacity: 0.18, roughness: 0.05, depthWrite: false }));
      glass.position.copy(body.clone().add(V(0, -2.9, 0)));
      root.add(glass);
      glowBag.add(new THREE.CylinderGeometry(0.35, 0.35, 1.3, 12), '#f3ead8', xf(body.clone().add(V(0, -4.0, 0))));
      glowBag.add(paint(blob(V(0.2, 0.42, 0.2), null), () => '#ffc65a'), null, xf(body.clone().add(V(0, -3.0, 0))));
      slots.push({ x: body.x, y: body.y + 0.1, z: body.z, r: 1.5, h: 4, turn: 0 });
      // Ivy trailing from the beam.
      for (let i = 0; i < leafCount; i++) {
        const x = -12 + i * 2.6 + random(), drop = 1 + random() * 3;
        const at = V(x, 9.8 - drop, -5.2);
        supportBag.add(tube([V(x, 9.8, -5.3), at], 0.07, { sides: 4 }), '#5a6a32');
        leafSpecs.push({ at, dir: V((random() - 0.5) * 0.8, -0.5, 1).normalize(), length: 2.6, width: 2.6, fold: 0.15, droop: 0.1 });
      }
      slots.push({ x: -6, y: -2.85, z: 3.6, r: 1.8, h: 5, turn: 0.3 });
      for (let i = 0; i < 22; i++) dewPoints.push({ at: chain.getPointAt(random()).add(V(0, -0.45, 0)), size: 0.18 + random() * 0.2, hang: true });
      antPath = Array.from({ length: 12 }, (_u, i) => chain.getPointAt(0.18 + i * 0.022).add(V(0, 0.38, 0)));
    } else {
      // Prickly pear pads: the nest wedged between two, spines all round.
      const pads: { at: THREE.Vector3; size: THREE.Vector3; turn: THREE.Euler }[] = [
        { at: V(0, -5.8, -0.4), size: V(4.4, 5.6, 1.0), turn: new THREE.Euler(0.12, 0.1, 0) },
        { at: V(-4.6, -0.6, -0.8), size: V(3.4, 4.4, 0.85), turn: new THREE.Euler(0.08, 0.35, 0.55) },
        { at: V(4.8, -0.2, -0.6), size: V(3.6, 4.6, 0.85), turn: new THREE.Euler(0.1, -0.3, -0.5) },
        { at: V(-1.5, 2.8, -5.6), size: V(3.6, 4.4, 0.85), turn: new THREE.Euler(-0.15, 0.05, 0.2) },
        { at: V(8.2, 4.8, -3.4), size: V(3.0, 3.8, 0.8), turn: new THREE.Euler(0, -0.5, -0.4) },
      ];
      const padTone = new THREE.Color('#5f8f4a').lerp(new THREE.Color('#8a9a52'), mood.wear * 0.4).lerp(new THREE.Color('#7a8aa0'), a.season === 'winter' ? 0.3 : 0);
      const spines: { matrix: THREE.Matrix4; colour?: string }[] = [];
      for (const pad of pads) {
        supportBag.add(paint(blob(pad.size, noise, 0.04, 0.4, 28, 16), (_q, n) => padTone.clone().lerp(new THREE.Color('#3f6a34'), Math.max(0, -n.z) * 0.3)), null, xf(pad.at, 1, pad.turn));
        const m = xf(pad.at, 1, pad.turn), q = new THREE.Quaternion().setFromEuler(pad.turn);
        for (let k = 0; k < 26; k++) {
          const u = random() * TAU, v = random() * 0.8;
          const local = V(Math.cos(u) * Math.sqrt(v) * pad.size.x, Math.sin(u) * Math.sqrt(v) * pad.size.y, (random() < 0.5 ? 1 : -1) * pad.size.z * Math.sqrt(Math.max(0, 1 - v)) * 1.02);
          const p = local.clone().applyMatrix4(m), normal = V(0, 0, Math.sign(local.z)).applyQuaternion(q);
          extra.add(new THREE.SphereGeometry(0.13, 6, 4), '#d8c9a0', xf(p));
          for (let s = 0; s < 3; s++) {
            const dir = normal.clone().add(V(random() - 0.5, random() - 0.5, random() - 0.5).multiplyScalar(0.9)).normalize();
            spines.push({ matrix: new THREE.Matrix4().compose(p, new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), dir), V(0.04, 0.9 + random() * 0.6, 0.04)) });
          }
        }
      }
      const spineGeometry = new THREE.ConeGeometry(1, 1, 4);
      spineGeometry.translate(0, 0.5, 0);
      instances(root, spineGeometry, matte({ color: '#f1ead6', roughness: 0.5 }), spines);
      // Fruit or bloom on the pad rims.
      const crowns = [V(-5.6, 3.5, -0.2), V(6.3, 4.2, 0.2), V(-1.2, 7.1, -5.3)];
      for (const at of crowns) {
        if (a.season === 'spring' || a.season === 'summer') {
          for (let k = 0; k < 8; k++) {
            const angle = (k / 8) * TAU;
            extra.add(paint(blob(V(0.55, 0.12, 0.38), null), () => '#f2c838'), null, xf(at.clone().add(V(Math.cos(angle) * 0.5, 0.35, Math.sin(angle) * 0.5)), 1, new THREE.Euler(0.5, -angle, 0)));
          }
          extra.add(new THREE.SphereGeometry(0.32, 10, 8), '#c9a43a', xf(at.clone().add(V(0, 0.4, 0))));
        } else extra.add(paint(blob(V(0.6, 0.85, 0.6), null), () => '#a4234f'), null, xf(at.clone().add(V(0, 0.5, 0))));
      }
      slots.push({ x: -5.4, y: 3.6, z: -0.6, r: 1.6, h: 4.5, turn: 0.4 }, { x: 6.2, y: 4.2, z: -0.3, r: 1.6, h: 4.5, turn: 0.1 }, { x: -1.3, y: 7.0, z: -5.4, r: 1.6, h: 4.5, turn: 0.2 });
      for (let i = 0; i < 26; i++) {
        const pad = pads[Math.floor(random() * pads.length)];
        const u = random() * TAU, v = random() * 0.7;
        dewPoints.push({ at: V(Math.cos(u) * Math.sqrt(v) * pad.size.x, Math.sin(u) * Math.sqrt(v) * pad.size.y, pad.size.z * Math.sqrt(1 - v) + 0.15).applyMatrix4(xf(pad.at, 1, pad.turn)), size: 0.18 + random() * 0.2 });
      }
      antPath = Array.from({ length: 12 }, (_u, i) => V(-6.5 + i * 0.42, 3.2 - i * 0.22, -0.2 + i * 0.03));
    }

    // Leaves, with dew on their faces and droppings on them if chicks are being raised.
    const foliage = new Bag();
    leafSpecs.forEach((spec, index) => {
      const tint = spec.tint ?? seasonLeaf(index);
      const edge = tint.clone().multiplyScalar(0.72), vein = tint.clone().lerp(new THREE.Color('#e8f0c8'), 0.4);
      foliage.add(leaf(spec.length, spec.width, { fold: spec.fold, droop: spec.droop, segments: 14, colour: (t, s) => (Math.abs(s) < 0.06 ? vein : tint.clone().lerp(edge, Math.abs(s) * 0.6 + t * 0.15).lerp(new THREE.Color('#8a7a3a'), a.season === 'autumn' ? 0 : mood.wear * 0.25 * Math.abs(s))) }), null, leafMatrix(spec));
      foliage.add(tube([spec.at.clone().add(spec.dir.clone().multiplyScalar(-0.6)), spec.at], 0.08, { sides: 4 }), edge);
      const beads = a.weather === 'golden' ? 2 : a.weather === 'rain' ? 4 : 6;
      for (let k = 0; k < beads; k++) dewPoints.push({ at: leafSurface(spec, 0.2 + random() * 0.7, (random() - 0.5) * 1.4).add(V(0, 0.08, 0)), size: (a.weather === 'rain' ? 0.35 : 0.16) + random() * (a.weather === 'rain' ? 0.35 : 0.22) });
      if (a.weather === 'rain' || a.weather === 'dew') dewPoints.push({ at: leafSurface(spec, 1, 0).add(V(0, -0.25, 0)), size: a.weather === 'rain' ? 0.5 : 0.3, hang: true });
      if (a.contents === 'nestlings' && index < 3)
        for (let k = 0; k < 3; k++) extra.add(paint(blob(V(0.32, 0.05, 0.6), null), () => '#f3f2ec'), null, xf(leafSurface(spec, 0.3 + random() * 0.5, (random() - 0.5) * 0.8).add(V(0, 0.04, 0)), 1, new THREE.Euler(0, random() * TAU, 0)));
    });
    // Dew on the rim of the nest itself.
    for (let i = 0; i < 16; i++) {
      const angle = random() * TAU;
      dewPoints.push({ at: V(Math.cos(angle) * 2.55 * sx, rim + 0.12, Math.sin(angle) * 2.55 * sx), size: 0.14 + random() * 0.16 });
    }

    supportBag.into(root, matte({ roughness: 0.82, metalness: a.support === 'clothesline' || a.support === 'chain' ? 0.35 : 0 }));
    foliage.into(root, matte({ roughness: 0.6, side: THREE.DoubleSide }));
    extra.into(root, matte({ roughness: 0.6, side: THREE.DoubleSide }));
    rimExtras.into(root, matte({ roughness: 0.6, side: THREE.DoubleSide, metalness: 0.2 }));
    glowBag.into(root, matte({ emissive: '#ffb347', emissiveIntensity: mix(0.6, 1.4, 1 - dawn), roughness: 0.5 }));
    fibres.into(root, matte({ roughness: 1, emissive: '#fff6e6', emissiveIntensity: 0.12 }));
    shreds.into(root, matte({ roughness: 0.9 }));
    silk.into(root, matte({ emissive: '#ffffff', emissiveIntensity: 0.35, roughness: 0.3 }));
    instances(root, lichenFlake(random), matte({ side: THREE.DoubleSide, roughness: 0.95 }), flakes);

    // Dew or frost.
    const frost = a.weather === 'frost';
    const beads = dewPoints.map(({ at, size, hang }) => ({ matrix: frost ? new THREE.Matrix4().compose(at, new THREE.Quaternion().setFromEuler(new THREE.Euler(random() * 3, random() * 3, random() * 3)), V(size * 0.7, size * 1.4, size * 0.7)) : xf(at, V(size, size * (hang ? 1.25 : 0.85), size)) }));
    if (frost) instances(root, new THREE.OctahedronGeometry(1, 0), matte({ color: '#f4f8ff', emissive: '#e8f0ff', emissiveIntensity: 0.35, roughness: 0.25 }), beads);
    else instances(root, new THREE.SphereGeometry(1, 14, 10), dewMaterial(hex(top), hex(bottom.clone().lerp(new THREE.Color('#6f8a52'), 0.5)), a.weather === 'golden' ? 0.7 : 0.5), beads);

    // ---- A visitor or a threat.
    const critters = new Bag();
    let hover: THREE.Group | null = null;
    let dangle: THREE.Group | null = null;
    if (a.visitor === 'ants') {
      for (let i = 0; i < antPath.length - 1; i += 1) {
        if (i % 3 === 2) continue;
        const p = antPath[i], q = antPath[i + 1];
        const dir = q.clone().sub(p).normalize();
        const side = V(0, 1, 0).cross(dir).normalize();
        critters.add(new THREE.SphereGeometry(1, 8, 6), '#2a1d16', xf(p.clone().addScaledVector(dir, -0.36).add(V(0, 0.16, 0)), 0.23));
        critters.add(new THREE.SphereGeometry(1, 8, 6), '#3a2418', xf(p.clone().add(V(0, 0.14, 0)), 0.14));
        critters.add(new THREE.SphereGeometry(1, 8, 6), '#2a1d16', xf(p.clone().addScaledVector(dir, 0.3).add(V(0, 0.16, 0)), 0.15));
        for (const s of [-1, 1]) for (const k of [-1, 0, 1]) critters.add(tube([p.clone().add(V(0, 0.1, 0)), p.clone().addScaledVector(side, s * 0.28).addScaledVector(dir, k * 0.18)], 0.02, { sides: 3 }), '#2a1d16');
      }
    } else if (a.visitor === 'spider') {
      dangle = new THREE.Group();
      dangle.position.set(1.6, 5.4, 1.2);
      root.add(dangle);
      const legs = new Bag();
      legs.add(tube([V(0, 0.3, 0), V(0, 12, 0)], 0.02, { sides: 3 }), '#ffffff');
      legs.add(paint(blob(V(0.42, 0.5, 0.42), null), () => '#5a4030'), null, xf(V(0, -0.35, 0)));
      legs.add(paint(blob(V(0.26, 0.24, 0.26), null), () => '#3c2a20'), null, xf(V(0, 0.18, 0)));
      for (let k = 0; k < 8; k++) {
        const s = k < 4 ? 1 : -1, j = k % 4;
        const hip = V(0, 0.18, 0), knee = V(s * 0.55, 0.42, (j - 1.5) * 0.3), foot = V(s * 0.8, -0.1, (j - 1.5) * 0.45);
        legs.add(tube([hip, knee, foot], 0.035, { sides: 3 }), '#3c2a20');
      }
      legs.into(dangle, matte({ roughness: 0.5 }));
    } else if (a.visitor === 'wasp') {
      hover = new THREE.Group();
      hover.position.set(-3.2, 5.2, 2.0);
      hover.rotation.y = 0.9;
      root.add(hover);
      const wasp = new Bag();
      wasp.add(paint(blob(V(0.42, 0.42, 0.85), null), (q) => (Math.sin(q.z * 9 + 1) > 0.1 ? '#f0c020' : '#1e1a14')), null, xf(V(0, -0.25, -0.95), 1, new THREE.Euler(0.45, 0, 0)));
      wasp.add(paint(blob(V(0.32, 0.32, 0.42), null), () => '#3a2a14'), null, xf(V(0, 0, 0)));
      wasp.add(paint(blob(V(0.3, 0.28, 0.26), null), () => '#e8b820'), null, xf(V(0, 0.1, 0.52)));
      for (const s of [-1, 1]) {
        wasp.add(tube(arc(V(s * 0.1, 0.3, 0.65), V(s * 0.45, 0.9, 1.2), V(0, 0.1, 0), 4), 0.025, { sides: 3 }), '#3a2a14');
        for (const k of [-1, 0, 1]) wasp.add(tube([V(s * 0.15, -0.2, k * 0.2), V(s * 0.45, -0.6, k * 0.3), V(s * 0.4, -1.1, k * 0.35)], 0.03, { sides: 3 }), '#d8a820');
      }
      wasp.into(hover, matte({ roughness: 0.45 }));
      for (const s of [-1, 1]) {
        const wing = new THREE.Mesh(new THREE.CircleGeometry(0.9, 16), new THREE.MeshStandardMaterial({ color: '#d8dce4', transparent: true, opacity: 0.35, depthWrite: false, side: THREE.DoubleSide }));
        wing.scale.set(0.45, 1, 1);
        wing.position.set(s * 0.65, 0.35, -0.25);
        wing.rotation.set(-Math.PI / 2 + 0.2, 0, s * 1.2);
        hover.add(wing);
      }
    }
    critters.into(root, matte({ roughness: 0.4 }));

    // ---- The blurred distance, painted on a card that place() turns to face the camera.
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 512;
    const g = canvas.getContext('2d')!;
    const gradient = g.createLinearGradient(0, 0, 0, 512);
    gradient.addColorStop(0, hex(top));
    gradient.addColorStop(0.55, hex(middle));
    gradient.addColorStop(1, hex(bottom));
    g.fillStyle = gradient;
    g.fillRect(0, 0, 512, 512);
    const blot = (x: number, y: number, rx: number, ry: number, colour: string, alpha: number) => {
      g.globalAlpha = alpha;
      g.fillStyle = colour;
      g.beginPath();
      g.ellipse(x, y, rx, ry, 0, 0, TAU);
      g.fill();
      g.globalAlpha = 1;
    };
    // The card is drawn 2.1 times the frame, so only the middle of the canvas shows: lay everything out there.
    const lo = 118, span = 276;
    const P = (u: number, v: number) => [lo + u * span, lo + v * span] as const;
    const blob2 = (u: number, v: number, ru: number, rv: number, colour: string, alpha: number) => { const [x, y] = P(u, v); blot(x, y, ru * span, rv * span, colour, alpha); };
    g.filter = 'blur(16px)';
    const sun = a.weather === 'golden' ? '#fff0c0' : '#fff6e8';
    blob2(0.15 + mood.daylight * 0.7, 0.62 - dawn * 0.3, 0.16, 0.16, sun, a.weather === 'rain' ? 0.25 : 0.85);
    if (a.behind === 'canopy') {
      const greens = a.season === 'autumn' ? ['#b07a3a', '#8a6a3a', '#c8963e'] : a.season === 'winter' ? ['#7a7468', '#8a8478'] : ['#4f7a42', '#3e6838', '#6a8f4e'];
      for (let i = 0; i < 14; i++) {
        const edge = i % 4;
        const u = edge === 0 ? random() * 0.2 : edge === 1 ? 0.8 + random() * 0.2 : random();
        const v = edge === 2 ? random() * 0.22 : edge === 3 ? 0.8 + random() * 0.2 : random();
        blob2(u, v, 0.14 + random() * 0.12, 0.1 + random() * 0.1, greens[i % greens.length], 0.8);
      }
      for (let i = 0; i < 6; i++) blob2(0.2 + random() * 0.6, 0.2 + random() * 0.5, 0.04 + random() * 0.05, 0.04 + random() * 0.05, '#fff4dc', 0.55);
    } else if (a.behind === 'sky') {
      for (let i = 0; i < 5; i++) blob2(random(), 0.1 + random() * 0.45, 0.18 + random() * 0.12, 0.04 + random() * 0.03, '#ffffff', 0.5);
      // A far treeline along the bottom edge.
      for (let i = 0; i < 9; i++) blob2(i / 8, 1.0 + random() * 0.04, 0.09 + random() * 0.05, 0.06 + random() * 0.04, a.season === 'winter' ? '#8a8a80' : a.season === 'autumn' ? '#b08850' : '#7a9466', 0.55);
    } else if (a.behind === 'garden') {
      blob2(0.5, 0.92, 0.8, 0.28, '#5f8a4a', 0.75);
      const blooms = ['#e6607a', '#f2c040', '#f5f0e8', '#b05ac0', '#e8402a', '#f29ab8'];
      for (let i = 0; i < 22; i++) blob2(random(), 0.45 + random() * 0.55, 0.025 + random() * 0.04, 0.025 + random() * 0.04, blooms[i % blooms.length], 0.75);
    } else {
      const [wx, wy] = P(0.3, -0.1), [ix, iy] = P(0.45, 0.18);
      g.globalAlpha = 0.85;
      g.fillStyle = '#e9e1d2';
      g.fillRect(wx, wy, 512, 512);
      g.fillStyle = '#4a4a50';
      g.fillRect(ix, iy, span * 0.28, span * 0.36);
      g.fillStyle = '#6a5848';
      g.fillRect(wx - 10, wy + span * 0.12, 512, span * 0.06);
      g.globalAlpha = 1;
      blob2(0.05, 0.95, 0.35, 0.18, '#5f7a4a', 0.65);
    }
    g.filter = 'blur(3px)';
    // Bokeh: dew and light caught out of focus.
    for (let i = 0; i < 12; i++) {
      const [x, y] = P(random(), random());
      g.globalAlpha = 0.18 + random() * 0.22;
      g.fillStyle = '#ffffff';
      g.beginPath();
      g.arc(x, y, 5 + random() * 12, 0, TAU);
      g.fill();
    }
    g.globalAlpha = 1;
    if (a.visitor === 'hawk') {
      g.filter = 'blur(1.5px)';
      g.fillStyle = 'rgba(48,42,40,0.85)';
      g.save();
      const [hx, hy] = P(0.28 + random() * 0.4, 0.12 + random() * 0.1);
      g.translate(hx, hy);
      g.rotate((random() - 0.5) * 0.4);
      g.scale(0.75, 0.75);
      g.beginPath();
      g.moveTo(0, 0);
      g.quadraticCurveTo(-30, -14, -64, -4);
      g.lineTo(-56, 2);
      g.quadraticCurveTo(-30, 0, -8, 10);
      g.lineTo(-6, 26);
      g.lineTo(6, 26);
      g.lineTo(8, 10);
      g.quadraticCurveTo(30, 0, 56, 2);
      g.lineTo(64, -4);
      g.quadraticCurveTo(30, -14, 0, 0);
      g.fill();
      g.restore();
    }
    g.filter = 'none';
    if (a.weather === 'mist') { g.fillStyle = 'rgba(240,240,236,0.45)'; g.fillRect(0, 0, 512, 512); }
    const cardMap = new THREE.CanvasTexture(canvas);
    cardMap.colorSpace = THREE.SRGBColorSpace;
    const card = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: cardMap, fog: false, toneMapped: false }));
    card.castShadow = card.receiveShadow = false;
    root.add(card);
    // Mist also drifts in front of the far leaves.
    if (a.weather === 'mist') {
      const veil = new THREE.Mesh(new THREE.PlaneGeometry(40, 14), new THREE.MeshBasicMaterial({ color: '#f2f2ee', transparent: true, opacity: 0.32, depthWrite: false, fog: false }));
      veil.position.set(0, 3, -7.5);
      root.add(veil);
    }

    // ---- Placement: true size where it fits, the hero sunk into the cup as deep as it needs.
    const hero: Slot = { x: 0, y: floorY, z: 0, r: 4.3 * sx, h: 7.5, turn: 0 };
    const camera = world.camera as THREE.OrthographicCamera;
    const key = world.keyLight!;
    const framing = context.framing ?? NATURAL_FRAMING;
    const yaw = (24 + framing.turn * 22) * Math.PI / 180;
    const pitch = Math.min(66, Math.max(24, 46 + (framing.elevation - 0.5) * 40)) * Math.PI / 180;
    const closeness = framing.distance < 0.5 ? 0.66 + framing.distance * 2 * 0.34 : 1 + (framing.distance - 0.5) * 2 * 0.5;
    const tiltAngle = ((context.seed & 1 ? 1 : -1) * framing.tilt * 7) * Math.PI / 180;
    world.capacity = 1 + slots.length;
    world.place = (items: readonly Placeable[]) => {
      const boxes: THREE.Box3[] = [new THREE.Box3(V(-8.5, -2.5, -5.5), V(8.5, 5.5, 5))];
      items.forEach((item, index) => {
        const slot = index === 0 ? hero : slots[(index - 1) % slots.length];
        item.holder.scale.setScalar(1);
        item.holder.position.set(0, 0, 0);
        item.holder.rotation.set(0, 0, 0);
        item.holder.updateMatrixWorld(true);
        const b = visibleBounds(item.holder);
        const r = b.isEmpty() ? 0.05 : Math.max(Math.abs(b.min.x), Math.abs(b.max.x), Math.abs(b.min.z), Math.abs(b.max.z), 1e-4);
        const h = b.isEmpty() ? 0.05 : Math.max(b.max.y, 1e-4);
        const scale = Math.min(U, slot.r / r, slot.h / h);
        item.holder.scale.setScalar(scale);
        let y = slot.y;
        if (index === 0) {
          // A tall hero sinks into the cup until its top clears the rim; a small one rides up on the down.
          y = Math.min(floorY + 0.45, Math.max(-0.4, rim + 1.6 - h * scale));
          mound.scale.y = Math.max(0.62, y - floorY + 0.3);
        }
        item.holder.position.set(slot.x, y, slot.z);
        item.holder.rotation.y = (index === 0 ? yaw * 0.7 : slot.turn) + (random() - 0.5) * 0.25;
        item.holder.updateMatrixWorld(true);
        boxes.push(visibleBounds(item.holder));
      });
      const bounds = boxes.reduce((sum, box) => sum.union(box), new THREE.Box3());
      const centre = bounds.getCenter(V());
      const direction = V(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch));
      camera.position.copy(centre).addScaledVector(direction, 80);
      camera.up.set(0, 1, 0);
      camera.lookAt(centre);
      camera.updateMatrixWorld(true);
      const seen = new THREE.Box2();
      for (const box of boxes)
        for (const x of [box.min.x, box.max.x])
          for (const y of [box.min.y, box.max.y])
            for (const z of [box.min.z, box.max.z]) {
              const p = V(x, y, z).applyMatrix4(camera.matrixWorldInverse);
              seen.expandByPoint(new THREE.Vector2(p.x, p.y));
            }
      const middle = seen.getCenter(new THREE.Vector2());
      const extent = Math.max(seen.getSize(new THREE.Vector2()).x, seen.getSize(new THREE.Vector2()).y) * 0.54 * closeness;
      const anchor = framing.anchor === 'left' ? extent * 0.22 : framing.anchor === 'right' ? -extent * 0.22 : 0;
      camera.translateX(middle.x + anchor);
      camera.translateY(middle.y);
      if (tiltAngle) camera.rotateZ(tiltAngle);
      camera.left = camera.bottom = -extent;
      camera.right = camera.top = extent;
      camera.near = 0.1;
      camera.far = 260;
      camera.updateProjectionMatrix();
      camera.updateMatrixWorld(true);
      // The card hangs far behind, square to the view, a little larger than the frame.
      const forward = V(0, 0, -1).applyQuaternion(camera.quaternion);
      card.position.copy(camera.position).addScaledVector(forward, 200);
      card.quaternion.copy(camera.quaternion);
      card.scale.set(extent * 2.1, extent * 2.1, 1);
      // Low dawn sun from the left, rising toward noon and setting to the right.
      const span = bounds.getSize(V()).length();
      const noon = 1 - Math.abs(mood.daylight - 0.5) * 2;
      key.target.position.copy(centre);
      key.position.copy(centre).add(V(-10 + mood.daylight * 16, 3 + noon * 8, 7).normalize().multiplyScalar(span * 1.5));
      key.intensity = a.weather === 'golden' ? 3.6 : a.weather === 'rain' || a.weather === 'mist' ? 2.0 : 2.9;
      if (a.weather === 'golden') key.color.set('#ffd9a0');
      const shadow = key.shadow.camera;
      shadow.left = shadow.bottom = -span * 0.6;
      shadow.right = shadow.top = span * 0.6;
      shadow.near = 0.1;
      shadow.far = span * 4;
      shadow.updateProjectionMatrix();
    };
    world.update = (_dt, time) => {
      if (hover) {
        hover.position.y = 5.2 + Math.sin(time * 3.1) * 0.25;
        hover.position.x = -3.2 + Math.sin(time * 1.3) * 0.35;
        for (const wing of hover.children.slice(1)) wing.rotation.z = (wing.position.x > 0 ? 1 : -1) * (1.2 + Math.sin(time * 70) * 0.3);
      }
      if (dangle) {
        dangle.position.y = 5.4 + Math.sin(time * 0.6) * 0.4;
        dangle.rotation.y = Math.sin(time * 0.4) * 0.5;
      }
    };
    return world;
  },
});
