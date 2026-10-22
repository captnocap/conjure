import * as THREE from 'three';
import { choice, defineThing, mix } from '@conjure/kit';
import { Bag, TAU, V, arc, blob, dewMaterial, field, finish, instances, leaf, matte, paint, tube, xf } from './bits';

type Bead = { matrix: THREE.Matrix4 };

/** A frame along a curve: tangent and two perpendiculars, for wrapping helices round a twig. */
function frameAt(curve: THREE.Curve<THREE.Vector3>, t: number) {
  const tangent = curve.getTangentAt(t).normalize();
  const side = new THREE.Vector3(0, 0, 1).cross(tangent);
  if (side.lengthSq() < 1e-6) side.set(1, 0, 0);
  side.normalize();
  const up = tangent.clone().cross(side).normalize();
  return { point: curve.getPointAt(t), tangent, side, up };
}

export default defineThing({
  questions: {
    binds: choice('What is the silk lashing to the twig?', {
      nest: 'A felted wedge of nest wall, plant down and lichen flakes, bound up under the twig.',
      leaf: 'A green leaf hauled up against the twig and stitched there with zigzag silk.',
      pod: 'A dry brown seed pod hanging in a cradle of threads.',
      twig: 'A second twig crossing beneath, the two lashed together with a tight lattice.',
      nothing: 'Nothing: only guy lines running from the twig down to the ground, a bare anchor.',
    }),
    dew: choice('How does the dew lie on the silk?', {
      beaded: 'Strung with tiny even beads, like a fine necklace.',
      heavy: 'Fat drops weighing the threads down into sagging curves.',
      frost: 'Furred with white frost crystals instead of water.',
      dry: 'No dew at all: bare silk catching the light alone.',
    }),
    twig: choice('What is the support?', {
      bare: 'A smooth grey-brown twig with a small fork.',
      lichened: 'An old twig crusted with pale green lichen.',
      budding: 'A spring twig with green buds and one new leaf unfurling.',
      thorny: 'A red-brown rose cane armed with hooked thorns.',
      grass: 'A tall bent grass stem instead of a twig.',
    }),
    state: choice('What is happening to the anchoring?', {
      holding: 'Every strand taut and holding.',
      snapped: 'One main guy line has snapped and its end has curled back on itself.',
      fresh: 'Bright new silk being laid: a tiny spider at work at the end of a strand.',
      old: 'Old grey silk, dusty, with specks of debris caught along it.',
    }),
    caught: choice('Has anything been caught in the threads?', {
      nothing: 'Nothing.',
      seed: 'A dandelion seed snagged by its little parachute.',
      petal: 'A single pink petal hanging in the strands.',
      gnat: 'A tiny gnat, already wrapped in silk.',
    }),
    loose: choice('What are the loose ends doing?', {
      plumb: 'A few short ends hang straight down, each with a drop on its tip.',
      streaming: 'Long gossamer ends streaming out sideways on a breath of air.',
      none: 'No loose ends at all: everything trimmed and tidy.',
    }),
  },

  build(a, context) {
    const { mood, random } = context;
    const root = new THREE.Group();
    const noise = field(random);
    const grass = a.twig === 'grass';

    // ---- The support, rising from the ground on the left up to the right.
    const twigCurve = new THREE.CatmullRomCurve3(grass
      ? [V(-0.04, -0.004, 0.002), V(-0.03, 0.03, 0.004), V(-0.008, 0.058, 0), V(0.022, 0.066, -0.004), V(0.045, 0.054, -0.006)]
      : [V(-0.042, -0.004, 0.002), V(-0.018, 0.022, 0.005), V(0.012, 0.043, -0.002), V(0.042, 0.06, -0.006)]);
    const thick = (t: number) => (grass ? mix(0.0016, 0.0007, t) : mix(0.0031, 0.0012, t));
    const barkTone = { bare: '#7a6a58', lichened: '#6f6556', budding: '#6e5a42', thorny: '#7d3b2c', grass: '#b3ad6a' }[a.twig];
    const bark = new Bag();
    const pts = twigCurve.getSpacedPoints(30);
    bark.add(tube(pts, thick, { sides: 9, flat: grass ? 0.45 : 1, up: V(0, 0, 1), colour: (t) => new THREE.Color(barkTone).lerp(new THREE.Color(grass ? '#d6cf8c' : '#9a8c78'), 0.25 * Math.sin(t * 40) ** 2) }));
    const forkFrom = twigCurve.getPointAt(0.58);
    const forkTo = forkFrom.clone().add(V(-0.012, 0.022, -0.006));
    if (!grass) {
      bark.add(tube(arc(forkFrom, forkTo, V(0.002, 0, 0), 6), (t) => mix(0.0016, 0.0007, t), { sides: 7, colour: () => barkTone }));
      // Leaf scars and nodes, and a cut end.
      for (const t of [0.22, 0.45, 0.8]) bark.add(new THREE.SphereGeometry(1, 8, 6), barkTone, xf(twigCurve.getPointAt(t), thick(t) * 1.25));
      bark.add(new THREE.CircleGeometry(thick(1), 9), '#c9b48e', xf(twigCurve.getPointAt(1), 1, new THREE.Quaternion().setFromUnitVectors(V(0, 0, 1), twigCurve.getTangentAt(1))));
    } else {
      // A grass blade peeling off the stem.
      bark.add(leaf(0.04, 0.005, { fold: 0.3, droop: 0.4, twist: 0.6, colour: (t) => new THREE.Color('#a6a35a').lerp(new THREE.Color('#d3c98a'), t) }), null, xf(twigCurve.getPointAt(0.3), 1, new THREE.Euler(-0.9, 0.6, 0)));
    }
    if (a.twig === 'thorny')
      for (let i = 0; i < 7; i++) {
        const t = 0.1 + (i / 7) * 0.85, f = frameAt(twigCurve, t);
        const dir = f.up.clone().multiplyScalar(Math.cos(i * 2.4)).addScaledVector(f.side, Math.sin(i * 2.4));
        const base = f.point.clone().addScaledVector(dir, thick(t) * 0.8);
        bark.add(tube([base, base.clone().addScaledVector(dir, 0.0025).addScaledVector(f.tangent, -0.0012)], (s) => mix(0.0011, 0.0001, s), { sides: 5 }), '#a2513a');
      }
    if (a.twig === 'budding') {
      for (const t of [0.35, 0.7]) {
        const f = frameAt(twigCurve, t);
        bark.add(paint(blob(V(0.0016, 0.0028, 0.0016), null), () => '#7fa63e'), null, xf(f.point.clone().addScaledVector(f.up, thick(t) + 0.0016), 1, new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), f.up.clone().addScaledVector(f.tangent, 0.6).normalize())));
      }
      bark.add(leaf(0.022, 0.011, { fold: 0.45, droop: 0.2, colour: (t, s) => new THREE.Color('#8fbf45').lerp(new THREE.Color('#5f8f2c'), Math.abs(s) * 0.5 + t * 0.2) }), null, xf(forkTo, 1, new THREE.Euler(-0.8, -0.6, 0)));
    }
    bark.into(root, matte({ roughness: 0.85, side: THREE.DoubleSide }));
    if (a.twig === 'lichened') {
      const flakes: { matrix: THREE.Matrix4; colour: string }[] = [];
      for (let i = 0; i < 40; i++) {
        const t = 0.08 + random() * 0.85, f = frameAt(twigCurve, t), angle = random() * TAU;
        const n = f.up.clone().multiplyScalar(Math.cos(angle)).addScaledVector(f.side, Math.sin(angle));
        if (n.y < -0.4) continue;
        const size = 0.0012 + random() * 0.0012;
        flakes.push({ matrix: new THREE.Matrix4().compose(f.point.clone().addScaledVector(n, thick(t)), new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), n), V(size, size, size)), colour: ['#a9c49a', '#8fb08e', '#c3d1ad'][Math.floor(random() * 3)] });
      }
      const flake = new THREE.CircleGeometry(1, 7);
      flake.rotateX(-Math.PI / 2);
      instances(root, flake, matte({ side: THREE.DoubleSide, roughness: 0.95 }), flakes);
    }

    // ---- The silk. Every strand goes through one bag; dew is strung along it afterwards.
    const silkTone = new THREE.Color('#e9edf1').lerp(new THREE.Color('#bdb6a4'), a.state === 'old' ? 0.7 : mood.wear * 0.35);
    const silk = new Bag();
    const strands: THREE.Vector3[][] = [];
    const radius = a.dew === 'frost' ? 0.00034 : 0.00019;
    const sagOf = a.dew === 'heavy' ? 0.006 : 0.0008;
    const strand = (from: THREE.Vector3, to: THREE.Vector3, sag = sagOf, beaded = true) => {
      const points: THREE.Vector3[] = [];
      for (let i = 0; i <= 12; i++) {
        const t = i / 12;
        points.push(from.clone().lerp(to, t).add(V(0, -Math.sin(t * Math.PI) * sag * from.distanceTo(to) / 0.05, 0)));
      }
      silk.add(tube(points, radius, { sides: 4 }), silkTone);
      if (beaded) strands.push(points);
      return points;
    };
    const helix = (t0: number, t1: number, turns: number, phase: number, lift: number) => {
      const points: THREE.Vector3[] = [];
      for (let i = 0; i <= turns * 14; i++) {
        const s = i / (turns * 14), t = mix(t0, t1, s), f = frameAt(twigCurve, t), angle = phase + s * turns * TAU;
        points.push(f.point.clone().addScaledVector(f.up, Math.cos(angle) * (thick(t) + lift)).addScaledVector(f.side, Math.sin(angle) * (thick(t) + lift)));
      }
      silk.add(tube(points, radius * 0.9, { sides: 4 }), silkTone);
    };
    const band0 = 0.6, band1 = 0.78;
    helix(band0, band1, 5, 0, 0.0003);
    helix(band0 + 0.02, band1 - 0.02, 4, Math.PI, 0.0005);
    const bandMid = twigCurve.getPointAt((band0 + band1) / 2);

    // What hangs in the lashing.
    const held = new Bag();
    const heldFlakes: { matrix: THREE.Matrix4; colour: string }[] = [];
    const ground = (x: number, z: number) => V(x, 0.0003, z);
    const below = bandMid.clone().add(V(0, -0.016, 0.002));
    if (a.binds === 'nest') {
      held.add(paint(blob(V(0.012, 0.011, 0.007), noise, 0.18, 3, 22, 14), (q, n) => new THREE.Color('#d9ccb1').lerp(new THREE.Color('#8f8574'), Math.max(0, -n.y) * 0.6 + Math.max(0, noise(q, 600)) * 0.25)), null, xf(below, 1, new THREE.Euler(0, 0.4, 0.2)));
      for (let i = 0; i < 26; i++) {
        const angle = random() * TAU, h = (random() - 0.5) * 1.5;
        const n = V(Math.cos(angle), h * 0.5, Math.sin(angle)).normalize();
        const at = below.clone().add(V(n.x * 0.0118, n.y * 0.0105, n.z * 0.0068));
        const size = 0.0018 + random() * 0.0015;
        heldFlakes.push({ matrix: new THREE.Matrix4().compose(at, new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), n), V(size, size, size)), colour: ['#8fae9a', '#7a9c8a', '#a3b896', '#5f8577', '#b0bfa0'][Math.floor(random() * 5)] });
      }
      for (let i = 0; i < 7; i++) {
        const t = mix(band0, band1, i / 6), f = frameAt(twigCurve, t);
        const top = f.point.clone().addScaledVector(f.up, -thick(t));
        const angle = (i / 6) * Math.PI * 1.6 - 0.8;
        strand(top, below.clone().add(V(Math.sin(angle) * 0.011, -0.004 - random() * 0.006, Math.cos(angle) * 0.006)), 0.0002);
      }
    } else if (a.binds === 'leaf') {
      const f = frameAt(twigCurve, band0 - 0.05);
      const leafGeometry = leaf(0.034, 0.018, { fold: 0.75, droop: -0.05, colour: (t, s) => (Math.abs(s) < 0.07 ? new THREE.Color('#b9cf7a') : new THREE.Color('#5d8f34').lerp(new THREE.Color('#9a8a3a'), mood.wear * 0.5 + Math.abs(s) * 0.15 + t * 0.1)) });
      const turn = new THREE.Quaternion().setFromUnitVectors(V(0, 0, 1), f.tangent).multiply(new THREE.Quaternion().setFromAxisAngle(V(0, 0, 1), Math.PI));
      held.add(leafGeometry, null, new THREE.Matrix4().compose(f.point.clone().addScaledVector(f.up, -thick(band0) - 0.0062), turn, V(1, 1, 1)));
      // Zigzag stitches from the leaf's edges up over the twig.
      for (let i = 0; i < 9; i++) {
        const t = mix(band0 - 0.04, band1 + 0.03, i / 8), g = frameAt(twigCurve, t);
        const sideways = i % 2 ? 1 : -1;
        strand(g.point.clone().addScaledVector(g.up, thick(t)), g.point.clone().addScaledVector(g.side, sideways * 0.009).addScaledVector(g.up, -0.0055), 0.0001);
      }
    } else if (a.binds === 'pod') {
      const pod = paint(blob(V(0.0055, 0.0145, 0.0055), noise, 0.08, 3, 18, 14), (q) => new THREE.Color('#8a6a45').lerp(new THREE.Color('#5a4330'), Math.max(0, Math.sin(Math.atan2(q.x, q.z) * 5)) * 0.5));
      const podAt = below.clone().add(V(0.002, -0.004, 0));
      held.add(pod, null, xf(podAt, 1, new THREE.Euler(0.15, 0, 0.25)));
      held.add(tube([podAt.clone().add(V(-0.003, -0.014, 0)), podAt.clone().add(V(-0.0045, -0.018, 0.001))], 0.0006, { sides: 5 }), '#5a4330');
      for (let i = 0; i < 6; i++) {
        const angle = (i / 6) * TAU;
        const t = mix(band0, band1, (i % 3) / 2), g = frameAt(twigCurve, t);
        strand(g.point.clone().addScaledVector(g.up, -thick(t)), podAt.clone().add(V(Math.cos(angle) * 0.0052, 0.004 - (i % 2) * 0.008, Math.sin(angle) * 0.0052)), 0.0002);
      }
    } else if (a.binds === 'twig') {
      const crossA = bandMid.clone().add(V(-0.006, -0.012, 0.022)), crossB = bandMid.clone().add(V(0.004, -0.01, -0.024));
      held.add(tube(arc(crossA, crossB, V(0, 0.003, 0), 6), (t) => mix(0.0018, 0.0013, t), { sides: 8 }), '#6f604f');
      for (let i = 0; i < 10; i++) {
        const t = mix(band0, band1, (i % 5) / 4), g = frameAt(twigCurve, t);
        strand(g.point.clone().addScaledVector(g.up, -thick(t) * 0.5), crossA.clone().lerp(crossB, 0.3 + (i / 10) * 0.4).add(V(0, 0.0015, 0)), 0.0001);
      }
    }
    held.into(root, matte({ roughness: 0.9, side: THREE.DoubleSide }));
    if (heldFlakes.length) {
      const flake = new THREE.CircleGeometry(1, 7);
      flake.rotateX(-Math.PI / 2);
      instances(root, flake, matte({ side: THREE.DoubleSide, roughness: 0.95 }), heldFlakes);
    }

    // Guy lines from the twig down to attachment discs on the ground: the anchor itself.
    const guys = Math.round(mix(3, 6, mood.density)) + (a.binds === 'nothing' ? 2 : 0);
    const discs: THREE.Vector3[] = [];
    let snappedDone = false;
    let spiderAt: { at: THREE.Vector3; dir: THREE.Vector3 } | null = null;
    for (let i = 0; i < guys; i++) {
      const t = mix(0.4, 0.97, i / Math.max(1, guys - 1)) + (random() - 0.5) * 0.04;
      const top = twigCurve.getPointAt(Math.min(0.99, t));
      const angle = -1.2 + (i / Math.max(1, guys - 1)) * 2.6 + (random() - 0.5) * 0.4;
      const reach = 0.02 + random() * 0.02;
      const foot = ground(top.x + Math.sin(angle) * reach * 0.6, Math.cos(angle) * reach + (random() - 0.5) * 0.01);
      if (a.state === 'snapped' && !snappedDone && i === Math.floor(guys / 2)) {
        // A broken line: it stops halfway and its end curls back up in a loose spiral.
        snappedDone = true;
        const mid = top.clone().lerp(foot, 0.5);
        const points = strand(top, mid, 0.0002);
        const curl: THREE.Vector3[] = [mid];
        for (let k = 1; k <= 14; k++) {
          const s = k / 14, r = 0.003 * (1 - s * 0.6);
          curl.push(mid.clone().add(V(Math.cos(s * TAU * 1.6) * r - r, Math.sin(s * TAU * 1.6) * r, s * 0.002)));
        }
        silk.add(tube(curl, radius, { sides: 4 }), silkTone);
        void points;
        continue;
      }
      strand(top, foot);
      discs.push(foot);
      if (a.state === 'fresh' && !spiderAt) spiderAt = { at: top.clone().lerp(foot, 0.62), dir: foot.clone().sub(top).normalize() };
    }
    const discBag = new Bag();
    for (const at of discs) {
      discBag.add(paint(blob(V(0.0022, 0.0004, 0.0022), noise, 0.2, 6, 10, 6), () => silkTone), null, xf(at));
      // Fanned attachment threads splaying out from each foot.
      for (let k = 0; k < 4; k++) {
        const angle = (k / 4) * TAU + random();
        silk.add(tube([at.clone().add(V(0, 0.0012, 0)), at.clone().add(V(Math.cos(angle) * 0.0035, 0.0002, Math.sin(angle) * 0.0035))], radius * 0.7, { sides: 3 }), silkTone);
      }
    }
    discBag.into(root, matte({ roughness: 0.5, emissive: '#ffffff', emissiveIntensity: 0.15 }));

    // Loose ends, each in its own pivot so it can drift.
    const drifters: { group: THREE.Group; phase: number; amp: number }[] = [];
    const looseCount = a.loose === 'none' ? 0 : 3;
    const looseMat = new THREE.MeshStandardMaterial({ color: silkTone, emissive: '#ffffff', emissiveIntensity: 0.4, roughness: 0.3 });
    const dropMat = looseCount && a.loose === 'plumb' && a.dew !== 'dry' && a.dew !== 'frost' ? dewMaterial('#dfe9f2', '#7c8c6a', 0.5) : null;
    for (let i = 0; i < looseCount; i++) {
      const t = 0.3 + i * 0.22 + random() * 0.08, f = frameAt(twigCurve, t);
      const group = new THREE.Group();
      group.position.copy(f.point.clone().addScaledVector(f.up, -thick(t)));
      root.add(group);
      const points: THREE.Vector3[] = [];
      const length = a.loose === 'plumb' ? 0.009 + random() * 0.012 : 0.035 + random() * 0.02;
      for (let k = 0; k <= 16; k++) {
        const s = k / 16;
        points.push(a.loose === 'plumb' ? V(Math.sin(s * 3) * 0.0006, -s * length, 0) : V(s * length, -s * 0.006 + Math.sin(s * 9 + i) * 0.0025, Math.sin(s * 5 + i) * 0.003));
      }
      const thread = new THREE.Mesh(tube(points, radius * 0.85, { sides: 3 }), looseMat);
      group.add(thread);
      if (dropMat) {
        const size = a.dew === 'heavy' ? 0.0016 : 0.0011;
        const drop = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 8), dropMat);
        drop.position.copy(points[16]).add(V(0, -size * 0.8, 0));
        drop.scale.set(size, size * 1.15, size);
        group.add(drop);
      }
      drifters.push({ group, phase: random() * TAU, amp: a.loose === 'plumb' ? 0.12 : 0.3 });
    }
    if (!looseCount) looseMat.dispose();

    // ---- Dew strung along the strands.
    const beads: Bead[] = [];
    const crystals: Bead[] = [];
    for (const points of strands) {
      const length = points[0].distanceTo(points[points.length - 1]);
      if (a.dew === 'beaded' || a.dew === 'heavy') {
        const step = a.dew === 'heavy' ? 0.007 : 0.0032;
        const count = Math.max(1, Math.floor(length / step));
        for (let k = 1; k < count; k++) {
          const s = (k + (random() - 0.5) * 0.4) / count;
          const index = Math.min(points.length - 2, Math.floor(s * (points.length - 1)));
          const at = points[index].clone().lerp(points[index + 1], s * (points.length - 1) - index);
          const size = a.dew === 'heavy' ? 0.0011 + random() * 0.0009 : 0.00045 + random() * 0.0004;
          beads.push({ matrix: xf(at.add(V(0, -size * 0.3, 0)), V(size, size * 1.1, size)) });
        }
      } else if (a.dew === 'frost') {
        const count = Math.floor(length / 0.0012);
        for (let k = 0; k < count; k++) {
          const s = k / count, index = Math.min(points.length - 2, Math.floor(s * (points.length - 1)));
          const at = points[index].clone().lerp(points[index + 1], s * (points.length - 1) - index);
          const size = 0.0005 + random() * 0.0006;
          crystals.push({ matrix: new THREE.Matrix4().compose(at, new THREE.Quaternion().setFromEuler(new THREE.Euler(random() * TAU, random() * TAU, random() * TAU)), V(size, size * 1.6, size)) });
        }
      }
    }
    if (a.dew !== 'dry') {
      // Dew sits on the twig too.
      for (let i = 0; i < (a.dew === 'frost' ? 0 : 6); i++) {
        const t = 0.1 + random() * 0.85, f = frameAt(twigCurve, t);
        const size = 0.0008 + random() * 0.0008;
        beads.push({ matrix: xf(f.point.clone().addScaledVector(f.up, thick(t) + size * 0.6), V(size, size * 0.85, size)) });
      }
    }
    silk.into(root, matte({ emissive: new THREE.Color('#ffffff').lerp(new THREE.Color(mood.warmth > 0.5 ? '#ffd9a0' : '#cfe3ff'), Math.abs(mood.warmth - 0.5)), emissiveIntensity: a.dew === 'dry' ? 0.45 : 0.22, roughness: 0.3, metalness: 0.2 }));
    instances(root, new THREE.SphereGeometry(1, 14, 10), dewMaterial(mood.warmth > 0.5 ? '#f3dfc0' : '#dfe9f2', '#7c8c6a', 0.5), beads);
    instances(root, new THREE.OctahedronGeometry(1, 0), matte({ color: '#f4f8ff', emissive: '#e8f0ff', emissiveIntensity: 0.4, roughness: 0.25 }), crystals);

    // ---- Debris, a spider, and anything caught.
    const extras = new Bag();
    if (a.state === 'old')
      for (const points of strands)
        for (let k = 0; k < 2; k++) {
          const at = points[1 + Math.floor(random() * (points.length - 2))];
          extras.add(new THREE.BoxGeometry(0.0009, 0.0006, 0.0008), random() < 0.5 ? '#5c4a38' : '#8a7a62', xf(at, 1, new THREE.Euler(random(), random(), random())));
        }
    if (spiderAt) {
      const { at, dir } = spiderAt;
      const q = new THREE.Quaternion().setFromUnitVectors(V(0, 0, 1), dir);
      extras.add(paint(blob(V(0.0016, 0.0014, 0.002), null), () => '#4a3a2c'), null, new THREE.Matrix4().compose(at.clone().addScaledVector(dir, -0.0018).add(V(0, -0.0012, 0)), q, V(1, 1, 1)));
      extras.add(paint(blob(V(0.001, 0.0009, 0.0011), null), () => '#3a2c22'), null, new THREE.Matrix4().compose(at.clone().addScaledVector(dir, 0.0008).add(V(0, -0.0008, 0)), q, V(1, 1, 1)));
      for (let leg = 0; leg < 8; leg++) {
        const sideways = leg < 4 ? 1 : -1, k = leg % 4;
        const hip = at.clone().addScaledVector(dir, 0.0008).add(V(0, -0.0008, 0));
        const knee = hip.clone().add(V(sideways * 0.002, 0.0012, (k - 1.5) * 0.0012).applyQuaternion(q));
        const foot = hip.clone().add(V(sideways * 0.0014, 0.0004, (k - 1.5) * 0.002).applyQuaternion(q)).lerp(at.clone().addScaledVector(dir, (k - 1.5) * 0.0015), 0.6);
        extras.add(tube([hip, knee, foot], 0.00014, { sides: 3 }), '#3a2c22');
      }
    }
    if (a.caught !== 'nothing' && strands.length) {
      const host = strands[Math.floor(strands.length / 2)];
      const at = host[Math.floor(host.length * 0.4)].clone();
      if (a.caught === 'seed') {
        extras.add(tube([at, at.clone().add(V(0, -0.006, 0.001))], 0.00012, { sides: 3 }), '#d8d2c0');
        extras.add(paint(blob(V(0.0005, 0.0018, 0.0005), null), () => '#8a6a45'), null, xf(at.clone().add(V(0, -0.0075, 0.001))));
        for (let k = 0; k < 14; k++) {
          const angle = (k / 14) * TAU;
          extras.add(tube([at, at.clone().add(V(Math.cos(angle) * 0.0045, 0.0014, Math.sin(angle) * 0.0045))], 0.00006, { sides: 3 }), '#f2efe6');
        }
      } else if (a.caught === 'petal') {
        extras.add(leaf(0.009, 0.007, { fold: -0.3, droop: 0.2, tip: 1.2, colour: (t) => new THREE.Color('#f2a9bd').lerp(new THREE.Color('#fbe2ea'), t) }), null, xf(at.clone().add(V(0, -0.001, 0)), 1, new THREE.Euler(1.3, 0.4, 0.2)));
      } else {
        extras.add(paint(blob(V(0.0012, 0.0012, 0.0024), noise, 0.15, 8, 10, 8), () => '#efeee8'), null, xf(at.clone().add(V(0, -0.0012, 0)), 1, new THREE.Euler(0.4, 0.8, 0)));
        extras.add(new THREE.SphereGeometry(0.0006, 8, 6), '#2b2522', xf(at.clone().add(V(0.0012, -0.001, 0.0018))));
      }
    }
    extras.into(root, matte({ roughness: 0.7, side: THREE.DoubleSide }));

    const sway = mix(0.15, 1, mood.energy);
    return finish(root, (_dt, time) => {
      for (const d of drifters) {
        d.group.rotation.z = Math.sin(time * mix(0.8, 3, mood.energy) + d.phase) * d.amp * sway;
        d.group.rotation.x = Math.sin(time * mix(0.6, 2.2, mood.energy) + d.phase * 2) * d.amp * 0.6 * sway;
      }
    });
  },
});
