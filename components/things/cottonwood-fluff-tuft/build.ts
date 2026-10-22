import * as THREE from 'three';
import { choice, defineThing, mix, score } from '@conjure/kit';
import { Bag, TAU, V, arc, blob, dewMaterial, field, finish, instances, leaf, matte, paint, tube, xf } from './bits';

const TINTS = { snow: '#f6f6f2', cream: '#efe3c9', buff: '#d8bf93', silver: '#d3d7db' } as const;

/** A random unit vector, biased upward by `lift` (0 none, 1 strongly). */
function direction(random: () => number, lift = 0) {
  const u = random() * 2 - 1, a = random() * TAU, s = Math.sqrt(1 - u * u);
  return V(s * Math.cos(a), u + lift, s * Math.sin(a)).normalize();
}

export default defineThing({
  questions: {
    source: choice('What plant is the down from?', {
      cottonwood: 'Cottonwood fluff: a tangled cloud of white cotton with tiny brown seeds caught in it.',
      thistle: 'Thistle silk: shaving-brush plumes of long silky bristles, each from a dark seed.',
      cattail: 'Cattail down: a dense tawny burst of short fibres from a broken brown seed head.',
      dandelion: 'Dandelion clocks: a tangle of little parachutes, each a seed on a stalk under an umbrella of hairs.',
      milkweed: 'Milkweed floss: long glossy straight silk streaming from flat brown seeds.',
    }),
    rests: choice('Where is it lying?', {
      loose: 'Alone on the surface, just come to rest.',
      twig: 'Snagged on the stub of a fallen twig, trailing.',
      grass: 'Caught on a bent grass stem, held up off the ground.',
      lining: 'Pressed flat into a felted mat, as it would be in the lining of a nest.',
    }),
    state: choice('What has happened to it?', {
      drifting: 'Nothing yet: loose and airy, every fibre lofted, just blown in.',
      gathered: 'Pinched into a tight wad as if a bird has been collecting it, a strand of spider silk wound round.',
      pulled: 'Half pulled apart, fibres drawn out into long strands where a bill tugged at it.',
    }),
    wet: choice('How dry is it?', {
      dry: 'Bone dry and fluffy, glowing where the light catches it.',
      dewy: 'Dew beads caught among the fibres like seed pearls.',
      soaked: 'Soaked by rain and matted into clumped, darker strands.',
    }),
    tint: choice('What colour is the down?', {
      snow: 'Bright snow white.',
      cream: 'Warm cream.',
      buff: 'Tawny buff, like a fawn.',
      silver: 'Cool silvery grey.',
    }),
    amount: score('How much down is there?', ['A single wisp', 'A small tuft', 'A generous armful for a bird']),
  },

  build(a, context) {
    const { mood, random } = context;
    const root = new THREE.Group();
    const noise = field(random);
    const soaked = a.wet === 'soaked';
    const tint = new THREE.Color(TINTS[a.tint]).lerp(new THREE.Color(mood.warmth > 0.5 ? '#f3dcb6' : '#dfe6ee'), Math.abs(mood.warmth - 0.5) * 0.3);
    if (soaked) tint.multiplyScalar(0.82);
    const shade = tint.clone().multiplyScalar(soaked ? 0.62 : 0.72).lerp(new THREE.Color('#8a7f6e'), 0.2);
    const size = mix(0.75, 1.45, a.amount) * (a.state === 'gathered' ? 0.75 : 1);
    const loft = soaked ? 0.55 : a.state === 'gathered' ? 0.6 : 1;
    const flat = a.rests === 'lining' ? 0.35 : soaked ? 0.7 : 1;
    const stretch = a.state === 'pulled' ? 1.7 : 1;

    // ---- Where it sits: a centre above the ground, maybe on a twig stub or a grass stem.
    const support = new Bag();
    let centre = V(0, 0.011 * size * flat, 0);
    let trail = V(1, -0.25, 0.2).normalize(); // which way loose fibres drift
    if (a.rests === 'twig') {
      const from = V(-0.036, 0.002, 0.009), to = V(0.03, 0.004, -0.007);
      support.add(tube(arc(from, to, V(0, 0.003, 0.004), 10), (t) => mix(0.0032, 0.0018, t), { sides: 9, colour: (t) => new THREE.Color('#6d5d4b').lerp(new THREE.Color('#8f7f69'), 0.4 * Math.sin(t * 30) ** 2) }));
      const stubBase = from.clone().lerp(to, 0.45).add(V(0, 0.0035, 0));
      const stubTop = stubBase.clone().add(V(0.003, 0.013, 0.002));
      support.add(tube([stubBase, stubTop], (t) => mix(0.0017, 0.001, t), { sides: 7 }), '#6d5d4b');
      support.add(new THREE.CircleGeometry(0.0011, 8), '#cdb892', xf(stubTop, 1, new THREE.Euler(-Math.PI / 2, 0, 0)));
      centre = stubTop.clone().add(V(0.004, -0.002, 0));
      trail = V(1, -0.5, 0.15).normalize();
    } else if (a.rests === 'grass') {
      const pts = [V(-0.024, -0.002, 0), V(-0.02, 0.016, 0.002), V(-0.01, 0.027, 0.001), V(0.004, 0.029, -0.002), V(0.015, 0.021, -0.004)];
      support.add(tube(pts, (t) => mix(0.0009, 0.0004, t), { sides: 7, smooth: 30, flat: 0.6, colour: (t) => new THREE.Color('#9a9850').lerp(new THREE.Color('#cfc48a'), t) }));
      support.add(leaf(0.02, 0.0035, { fold: 0.3, droop: 0.5, twist: 0.5, colour: (t) => new THREE.Color('#8f9a4c').lerp(new THREE.Color('#c9c184'), t) }), null, xf(V(-0.022, 0.008, 0.001), 1, new THREE.Euler(-0.9, 1.2, 0)));
      centre = V(-0.003, 0.026, 0.001);
      trail = V(0.6, -0.8, 0.1).normalize();
    }
    support.into(root, matte({ roughness: 0.85, side: THREE.DoubleSide }));

    // ---- The down itself: soft cores, then many fibres.
    const cores = new Bag();
    const fibres = new Bag();
    const glossy = new Bag();
    const seeds = new Bag();
    const dewAt: THREE.Vector3[] = [];
    const fibre = (from: THREE.Vector3, dir: THREE.Vector3, length: number, curl: number, radius = 0.00009) => {
      const pts: THREE.Vector3[] = [];
      const side = V(dir.y, dir.z, -dir.x).cross(dir).normalize(), phase = random() * TAU;
      for (let k = 0; k <= 6; k++) {
        const s = k / 6;
        pts.push(from.clone().addScaledVector(dir, length * s).addScaledVector(side, Math.sin(s * 5 + phase) * curl * length).add(V(0, -s * s * length * 0.15 * (soaked ? 3 : 1), 0)));
      }
      return { geometry: tube(pts, radius, { sides: 3, colour: (t) => shade.clone().lerp(tint, Math.min(1, 0.35 + t)) }), tip: pts[6] };
    };
    const squash = (p: THREE.Vector3) => p.set((p.x - centre.x) * stretch + centre.x, (p.y - centre.y) * flat + centre.y, p.z);
    const R = 0.012 * size;

    if (a.source === 'cottonwood' || a.source === 'cattail') {
      const cattail = a.source === 'cattail';
      const lumps = cattail ? 4 : 6;
      const coreTone = cattail ? tint.clone().lerp(new THREE.Color('#c9a873'), 0.45) : tint;
      for (let i = 0; i < lumps; i++) {
        const at = centre.clone().add(direction(random, 0.1).multiplyScalar(R * 0.55 * random()));
        const r = R * (0.5 + random() * 0.35) * loft;
        cores.add(paint(blob(V(r * stretch, r * flat * 0.85, r), noise, 0.25, 4, 16, 10), (_q, n) => shade.clone().lerp(coreTone, Math.min(1, 0.45 + n.y * 0.55))), null, xf(at));
      }
      if (cattail) cores.add(tube([centre.clone().add(V(-R * 0.4, -R * 0.3, 0)), centre.clone().add(V(-R * 1.25, -R * 0.55, R * 0.25))], (t) => R * mix(0.2, 0.12, t), { sides: 9 }), '#6a4a30');
      const count = Math.round((cattail ? 650 : 480) * size);
      for (let i = 0; i < count; i++) {
        const dir = direction(random, 0.15).lerp(trail, a.state === 'pulled' ? 0.4 : 0.1).normalize();
        const from = centre.clone().addScaledVector(dir, R * (0.4 + random() * 0.4) * loft);
        const length = (cattail ? 0.004 + random() * 0.005 : 0.005 + random() * 0.011) * loft * size;
        const f = fibre(squash(from), dir, length, cattail ? 0.08 : 0.22, 0.00012);
        fibres.add(f.geometry);
        if (i % 17 === 0) dewAt.push(f.tip);
      }
      for (let i = 0; i < (cattail ? 4 : 11); i++) {
        const at = squash(centre.clone().addScaledVector(direction(random, 0.3), R * (0.6 + random() * 0.4) * loft));
        seeds.add(paint(blob(V(0.0004, 0.0004, 0.0011), null), () => (cattail ? '#7a5a3a' : '#5e4a36')), null, xf(at, 1, new THREE.Euler(random() * 3, random() * 3, 0)));
      }
    } else if (a.source === 'thistle' || a.source === 'milkweed') {
      const milkweed = a.source === 'milkweed';
      const plumes = Math.round(mix(2, 6, a.amount));
      for (let i = 0; i < plumes; i++) {
        // Each seed sits low; its silk fans away from it.
        const seedAt = squash(centre.clone().add(V((random() - 0.5) * R * 1.6, -R * 0.5 * flat + random() * R * 0.4, (random() - 0.5) * R * 1.4)));
        const axis = milkweed ? trail.clone().add(V((random() - 0.5) * 0.5, 0.35 + random() * 0.3, (random() - 0.5) * 0.6)).normalize() : direction(random, 0.9).lerp(trail, 0.2).normalize();
        const q = new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), axis);
        seeds.add(paint(milkweed ? blob(V(0.0032, 0.0008, 0.0024), null) : blob(V(0.0008, 0.0018, 0.0008), null), () => (milkweed ? '#7c5634' : '#4e3f33')), null, new THREE.Matrix4().compose(seedAt.clone().addScaledVector(axis, -0.001), q, V(1, 1, 1)));
        const bristles = milkweed ? 44 : 34;
        const spread = (milkweed ? 0.28 : 0.6) * (a.state === 'gathered' ? 0.5 : 1) * (soaked ? 0.4 : 1);
        for (let k = 0; k < bristles; k++) {
          const angle = random() * TAU, tilt = Math.sqrt(random()) * spread;
          const dir = V(Math.sin(tilt) * Math.cos(angle), Math.cos(tilt), Math.sin(tilt) * Math.sin(angle)).applyQuaternion(q);
          const length = (milkweed ? 0.022 + random() * 0.012 : 0.015 + random() * 0.007) * size * (soaked ? 0.75 : 1) * (a.state === 'pulled' ? 1.3 : 1);
          const f = fibre(seedAt, dir, length, milkweed ? 0.02 : 0.05, milkweed ? 0.00008 : 0.0001);
          (milkweed ? glossy : fibres).add(f.geometry);
          if (k % 9 === 0) dewAt.push(f.tip);
          // Thistle bristles are feathered: a few side hairs near the tips.
          if (!milkweed && k % 3 === 0) {
            const mid = seedAt.clone().addScaledVector(dir, length * 0.7);
            fibres.add(tube([mid, mid.clone().add(direction(random).multiplyScalar(0.0025))], 0.00005, { sides: 3 }), tint);
          }
        }
      }
    } else {
      // Dandelion clocks: a seed, a slender beak, and an umbrella of hairs.
      const clocks = Math.round(mix(3, 9, a.amount));
      for (let i = 0; i < clocks; i++) {
        const base = squash(centre.clone().add(V((random() - 0.5) * R * 1.0, -R * 0.5 * flat + random() * R * 0.4, (random() - 0.5) * R * 0.9)));
        const axis = direction(random, a.rests === 'lining' ? 0.3 : 1.3).lerp(trail, 0.12).normalize();
        const q = new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), axis);
        seeds.add(paint(blob(V(0.0006, 0.0021, 0.0006), noise, 0.15, 30, 8, 8), () => '#7b6248'), null, new THREE.Matrix4().compose(base, q, V(1, 1, 1)));
        const top = base.clone().addScaledVector(axis, 0.0085 * Math.min(1.2, size));
        fibres.add(tube([base.clone().addScaledVector(axis, 0.002), top], 0.00009, { sides: 3 }), shade.clone().lerp(tint, 0.6));
        const hairs = 28;
        for (let k = 0; k < hairs; k++) {
          const angle = (k / hairs) * TAU + random() * 0.2, tilt = 1.05 + (random() - 0.5) * 0.3;
          const dir = V(Math.sin(tilt) * Math.cos(angle), Math.cos(tilt), Math.sin(tilt) * Math.sin(angle)).applyQuaternion(q);
          const f = fibre(top, dir, 0.0065 * (soaked ? 0.6 : 1), 0.03, 0.0001);
          fibres.add(f.geometry);
          if (k % 7 === 0) dewAt.push(f.tip);
        }
      }
    }

    // Long drawn-out strands where it was tugged.
    if (a.state === 'pulled')
      for (let i = 0; i < 14; i++) {
        const from = centre.clone().addScaledVector(trail, R * 0.6).add(V(0, (random() - 0.5) * R * 0.6, (random() - 0.5) * R * 0.8));
        const f = fibre(from, trail.clone().add(V(0, 0.1 + (random() - 0.5) * 0.2, (random() - 0.5) * 0.3)).normalize(), 0.016 + random() * 0.014, 0.06, 0.00011);
        fibres.add(f.geometry);
      }
    // A silk thread wound round a gathered wad.
    if (a.state === 'gathered') {
      const pts: THREE.Vector3[] = [];
      for (let k = 0; k <= 90; k++) {
        const s = k / 90, angle = s * TAU * 4.5 + Math.sin(s * 17) * 0.4;
        const r = R * (0.62 + 0.12 * Math.sin(s * 23 + 1)) * loft;
        pts.push(centre.clone().add(V(Math.cos(angle) * r * stretch, Math.sin(s * TAU * 1.3) * R * 0.45 * flat, Math.sin(angle) * r)));
      }
      glossy.add(tube(pts, 0.0001, { sides: 3 }), '#ffffff');
    }

    cores.into(root, matte({ roughness: soaked ? 0.45 : 1, emissive: tint, emissiveIntensity: soaked ? 0.02 : 0.08 }));
    const fibreMesh = fibres.into(root, matte({ roughness: soaked ? 0.4 : 0.9, emissive: tint, emissiveIntensity: soaked ? 0.04 : 0.22 }));
    glossy.into(root, matte({ roughness: 0.25, metalness: 0.25, emissive: '#ffffff', emissiveIntensity: soaked ? 0.1 : 0.35 }));
    seeds.into(root, matte({ roughness: 0.6 }));

    if (a.wet !== 'dry') {
      const beads = dewAt.filter((_p, i) => i % (soaked ? 3 : 1) === 0).slice(0, soaked ? 10 : 40).map((at) => {
        const s = (soaked ? 0.0009 : 0.0004) + random() * (soaked ? 0.0008 : 0.0005);
        return { matrix: xf(at, V(s, s * 1.1, s)) };
      });
      instances(root, new THREE.SphereGeometry(1, 12, 8), dewMaterial('#e3ecf2', '#86907a', 0.5), beads);
    }

    // The fibres breathe and shiver in the air, more so when the moment is restless.
    const amp = soaked ? 0.003 : mix(0.004, 0.03, mood.energy);
    if (fibreMesh) {
      // Pivot the fibres about the tuft's centre so the shiver stays in place.
      const pivot = new THREE.Group();
      pivot.position.copy(centre);
      fibreMesh.removeFromParent();
      fibreMesh.position.copy(centre).multiplyScalar(-1);
      pivot.add(fibreMesh);
      root.add(pivot);
      return finish(root, (_dt, time) => {
        pivot.rotation.z = Math.sin(time * mix(0.8, 3.5, mood.energy)) * amp;
        pivot.rotation.x = Math.sin(time * mix(0.6, 2.7, mood.energy) + 1) * amp * 0.7;
        pivot.scale.setScalar(1 + Math.sin(time * 1.3) * amp * 0.5);
      });
    }
    return finish(root);
  },
});
