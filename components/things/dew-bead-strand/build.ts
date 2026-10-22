import * as THREE from 'three';
import { choice, defineThing, mix, noul, score } from '@conjure/kit';
import { Bag, type Tone, V, aim, arc, dewMaterial, finish, matte, tube, xf } from './bits';

const SCENES = {
  meadow: { sky: '#cfe6f5', ground: '#6f9a58' },
  sunrise: { sky: '#ffd9a0', ground: '#c9663a' },
  bluesky: { sky: '#8fc4f2', ground: '#3f6fb0' },
  flower: { sky: '#f7d3e6', ground: '#c9478f' },
  overcast: { sky: '#dfe3e6', ground: '#7f8a90' },
  dusk: { sky: '#f0b7a8', ground: '#5b4a86' },
} as const;

export default defineThing({
  questions: {
    strand: choice('How is the silk strung?', {
      single: 'One thread sagging between two stems, a single necklace.',
      double: 'Two threads, one above the other, a doubled string of pearls.',
      festoon: 'A thread looping across three stems in two scallops, like bunting.',
      broken: 'Snapped at one end: it hangs straight down from one stem, the beads run together at the bottom.',
    }),
    grading: choice('How are the beads sized along it?', {
      pearls: 'Graduated like a pearl necklace: largest at the low point, tiny near the ends.',
      even: 'A neat row of small equal beads, like a rosary.',
      morse: 'Big drops alternating with pinhead ones, dots and dashes.',
      lone: 'Almost bare: one heavy drop at the lowest point and a few specks.',
    }),
    sag: score('How heavily does the thread sag?', ['Nearly taut', 'A gentle curve', 'Bowed deep under the weight']),
    holds: choice('What do the beads hold inside them?', {
      meadow: 'Green grass and pale sky, upside down.',
      sunrise: 'An orange low sun and a burning horizon.',
      bluesky: 'Clear deep blue.',
      flower: 'The pink blur of a flower close behind.',
      overcast: 'Flat silver-grey, an overcast morning.',
      dusk: 'Violet and rose, the last light.',
    }),
    stems: choice('What is it strung between?', {
      grass: 'Fresh grass stems with blades.',
      twigs: 'Bare dark twigs with buds.',
      bramble: 'Arching red bramble stems with thorns.',
      umbels: 'Dry straw-coloured seed heads, spoked like tiny umbrellas.',
    }),
    falling: noul('Is one drop letting go and falling?'),
  },

  build(a, context) {
    const { mood, random } = context;
    const root = new THREE.Group(), hang = new THREE.Group();
    const plant = new Bag(), silk = new Bag(), dew = new Bag(), still = new Bag();
    const tone = (c: Tone, lift = 0) => new THREE.Color(c).offsetHSL((mood.warmth - 0.5) * 0.03, (mood.cheer - 0.5) * 0.2, lift);
    const H = 0.25, tie = 0.225;
    const three = a.strand === 'festoon';
    const xs = three ? [-0.25, 0, 0.25] : [-0.15, 0.15];

    // Supports.
    const stemTone = tone({ grass: '#6f9a45', twigs: '#4a3a30', bramble: '#8a3b45', umbels: '#c5ad6e' }[a.stems]).lerp(new THREE.Color('#b9a56e'), a.stems === 'grass' ? mood.wear * 0.7 : mood.wear * 0.2);
    xs.forEach((x, index) => {
      const lean = (random() - 0.5) * 0.05, top = V(x, H + (random() - 0.3) * 0.06, 0);
      const points = arc(V(x + lean, 0, (random() - 0.5) * 0.02), top, V(lean * 0.5, 0, 0), 10);
      // Keep the tie point exactly on the stem.
      const at = (y: number) => { const t = y / top.y; return points[Math.min(10, Math.round(t * 10))]; };
      plant.add(tube(points, (t) => mix(a.stems === 'twigs' ? 0.009 : 0.007, 0.003, t), { sides: 6 }), stemTone);
      if (a.stems === 'grass') {
        for (let i = 0; i < 4; i++) {
          const base = points[0].clone().add(V((random() - 0.5) * 0.03, 0, (random() - 0.5) * 0.03));
          plant.add(tube(arc(base, base.clone().add(V((random() - 0.5) * 0.14, 0.07 + random() * 0.12, (random() - 0.5) * 0.1)), V(0, 0.02, 0), 6), (t) => mix(0.009, 0.001, t), { sides: 5, flat: 0.2 }), stemTone.clone().offsetHSL(0, 0, (random() - 0.5) * 0.1));
        }
        const from = at(0.14);
        plant.add(tube(arc(from, from.clone().add(V((index ? 1 : -1) * 0.12, 0.1, 0.03)), V(0, 0.03, 0), 8), (t) => mix(0.009, 0.001, t), { sides: 5, flat: 0.18 }), stemTone);
      } else if (a.stems === 'twigs') {
        for (let i = 0; i < 3; i++) {
          const from = points[3 + i * 2], side = (i + index) % 2 ? 1 : -1;
          const tip = from.clone().add(V(side * (0.04 + random() * 0.04), 0.05 + random() * 0.03, (random() - 0.5) * 0.05));
          plant.add(tube([from, tip], (t) => mix(0.004, 0.002, t), { sides: 5 }), stemTone);
          plant.add(new THREE.SphereGeometry(1, 8, 6), tone('#7a5a3a'), aim(tip, tip.clone().add(V(side * 0.3, 1, 0)), V(0.005, 0.009, 0.005)));
        }
        plant.add(new THREE.SphereGeometry(1, 8, 6), tone('#7a5a3a'), xf(top.clone().add(V(0, 0.006, 0)), V(0.006, 0.011, 0.006)));
      } else if (a.stems === 'bramble') {
        for (let i = 1; i < 10; i++) {
          const p = points[i], side = i % 2 ? 1 : -1;
          plant.add(new THREE.ConeGeometry(0.004, 0.016, 5), tone('#b0575a'), aim(p, p.clone().add(V(side, -0.25, (random() - 0.5) * 0.8))));
        }
        for (let i = 0; i < 2; i++) {
          const from = points[4 + i * 3], side = (i + index) % 2 ? 1 : -1;
          const leaf = arc(from, from.clone().add(V(side * 0.09, 0.02, 0.03)), V(0, 0.025, 0), 8);
          plant.add(tube(leaf, (t) => 0.002 + 0.026 * Math.sin(Math.min(1, t * 1.1) * Math.PI) ** 0.8, { sides: 8, flat: 0.1, up: V(0, 1, 0) }), tone('#587a3a').lerp(new THREE.Color('#a3562e'), mood.wear * 0.7));
        }
      } else {
        const spokes = 9 + Math.floor(random() * 4);
        for (let i = 0; i < spokes; i++) {
          const angle = (i / spokes) * Math.PI * 2, tip = top.clone().add(V(Math.cos(angle) * 0.05, 0.04 + random() * 0.01, Math.sin(angle) * 0.05));
          plant.add(tube([top, top.clone().lerp(tip, 0.5).add(V(0, -0.006, 0)), tip], 0.0016, { sides: 4, smooth: 6 }), stemTone);
          plant.add(new THREE.SphereGeometry(1, 6, 5), stemTone.clone().offsetHSL(0, 0, -0.08), xf(tip, V(0.006, 0.004, 0.006)));
        }
      }
    });

    // Beads fade with the day: fat at dawn, shrinking toward noon.
    const fresh = mix(1, 0.72, Math.sin(mood.daylight * Math.PI)) * mix(0.9, 1.08, mood.density);
    const silkTone = '#8d9aa5', thread = 0.0016;
    let lowest = V(0, tie, 0), lowestR = 0;
    const bead = (bag: Bag, p: THREE.Vector3, r: number) => {
      bag.add(new THREE.SphereGeometry(1, r > 0.008 ? 18 : 10, r > 0.008 ? 12 : 7), null, xf(p.clone().add(V(0, -r * 0.35, 0)), V(r, r * 1.1, r)));
      if (p.y - r < lowest.y - lowestR) { lowest = p.clone(); lowestR = r; }
    };
    const sizeAt = (t: number, i: number) => {
      const mid = Math.sin(t * Math.PI);
      if (a.grading === 'pearls') return mix(0.006, 0.034, mid ** 1.6);
      if (a.grading === 'even') return 0.0125;
      if (a.grading === 'morse') return i % 2 ? 0.006 : mix(0.017, 0.027, random());
      return Math.abs(t - 0.5) < 0.04 ? 0.04 : 0.005;
    };
    const string = (A: THREE.Vector3, B: THREE.Vector3, sag: number) => {
      const curve = (t: number) => A.clone().lerp(B, t).add(V(0, -sag * 4 * t * (1 - t), 0));
      silk.add(tube(Array.from({ length: 25 }, (_unused, i) => curve(i / 24)), thread, { sides: 5 }), silkTone);
      const length = A.distanceTo(B) * (1 + sag * 2);
      if (a.grading === 'lone') {
        bead(dew, curve(0.5), 0.04 * fresh);
        for (let i = 0; i < 6; i++) bead(dew, curve(0.08 + random() * 0.84), 0.005);
        return;
      }
      let s = 0.05, i = 0;
      while (s < 0.95 && i < 60) {
        const r = sizeAt(s, i) * fresh;
        s += (r * 1.25) / length;
        if (s > 0.96) break;
        bead(dew, curve(s), r);
        s += (r * 1.25 + (a.grading === 'even' ? 0.006 : 0.003)) / length;
        i++;
      }
    };
    const sag = mix(0.02, 0.1, a.sag);
    const A = V(xs[0], tie, 0), B = V(xs[1], tie, 0);
    if (a.strand === 'single') string(A, B, sag);
    else if (a.strand === 'double') { string(A, B, sag * 0.6); string(A.clone().add(V(0, -0.06, 0)), B.clone().add(V(0, -0.06, 0)), sag * 1.1 + 0.015); }
    else if (a.strand === 'festoon') { string(A, B, sag * 0.8); string(B, V(xs[2], tie, 0), sag * 0.8 * mix(0.7, 1.3, random())); }
    else {
      // A snapped thread: plumb from the left tie with the drops run together at the end.
      const end = A.clone().add(V(0.035 + sag * 0.1, -0.2, 0.012));
      const path = [A, A.clone().lerp(end, 0.5).add(V(0.012, 0, 0)), end];
      silk.add(tube(path, thread, { sides: 5, smooth: 12 }), silkTone);
      const count = a.grading === 'lone' ? 1 : a.grading === 'even' ? 6 : 5;
      let y = end.y;
      for (let i = 0; i < count; i++) {
        const r = (a.grading === 'even' ? 0.0125 : mix(0.032, 0.007, i / Math.max(1, count - 1))) * fresh * (a.grading === 'lone' ? 1.3 : 1);
        y += r;
        bead(dew, V(end.x - (y - end.y) * 0.05, y + r * 0.35, end.z), r);
        y += r * 1.5;
      }
      // The stub left on the other stem curls back on itself.
      silk.add(tube([B, B.clone().add(V(-0.03, -0.03, 0.01)), B.clone().add(V(-0.02, -0.07, 0)), B.clone().add(V(-0.035, -0.085, -0.01))], thread, { sides: 5, smooth: 12 }), silkTone);
      bead(dew, B.clone().add(V(-0.03, -0.03, 0.01)), 0.005 * fresh);
    }
    // Worn strands trail loose ends.
    for (let i = 0; i < Math.round(mood.wear * 3); i++) {
      const from = V(xs[i % xs.length], tie - 0.01 - random() * 0.05, 0), side = random() < 0.5 ? -1 : 1;
      silk.add(tube([from, from.clone().add(V(side * 0.03, -0.02, 0.01)), from.clone().add(V(side * 0.045, -0.06 - random() * 0.04, 0.02))], thread * 0.8, { sides: 4, smooth: 8 }), silkTone);
    }
    // A few beads sit on the stems themselves.
    for (const x of xs) for (let i = 0; i < 2; i++) still.add(new THREE.SphereGeometry(1, 10, 7), null, xf(V(x + (random() - 0.5) * 0.012, 0.06 + random() * 0.18, 0.006), 0.004 + random() * 0.004));

    const scene = SCENES[a.holds];
    const glass = dewMaterial(tone(scene.sky).lerp(new THREE.Color('#ffffff'), 0.12), tone(scene.ground).lerp(new THREE.Color('#dfeaf0'), 0.12), mix(0.15, 0.38, mood.cheer));
    let drop: THREE.Mesh | null = null;
    const span = Math.max(0.05, lowest.y - lowestR * 2 - 0.02);
    if (a.falling) {
      const geometry = new THREE.SphereGeometry(1, 14, 10);
      const p = geometry.getAttribute('position');
      for (let i = 0; i < p.count; i++) if (p.getY(i) > 0) p.setXYZ(i, p.getX(i) * (1 - p.getY(i) * 0.75), p.getY(i) * 1.9, p.getZ(i) * (1 - p.getY(i) * 0.75));
      geometry.computeVertexNormals();
      drop = new THREE.Mesh(geometry, glass);
      drop.scale.setScalar(Math.max(0.012, lowestR * 0.6));
      drop.position.set(lowest.x, lowest.y - lowestR * 1.4 - span * 0.45, lowest.z);
      drop.castShadow = true;
      root.add(drop);
      // Where the last one landed.
      still.add(new THREE.SphereGeometry(1, 16, 8), null, xf(V(lowest.x, 0.0015, lowest.z), V(0.04, 0.004, 0.034)));
      for (let i = 0; i < 5; i++) still.add(new THREE.SphereGeometry(1, 8, 6), null, xf(V(lowest.x + (random() - 0.5) * 0.11, 0.003, lowest.z + (random() - 0.5) * 0.09), 0.003 + random() * 0.003));
    }

    plant.into(root, matte({ roughness: 0.85 }));
    hang.position.y = tie;
    root.add(hang);
    const strandMesh = silk.into(hang, matte({ roughness: 0.5, emissive: '#56626c', emissiveIntensity: 0.25 }));
    const beadMesh = dew.into(hang, glass);
    for (const mesh of [strandMesh, beadMesh]) if (mesh) mesh.position.y = -tie;
    still.into(root, glass);

    const top = drop ? drop.position.y : 0, pace = mix(0.25, 2.2, mood.energy), swing = mix(0.01, 0.16, mood.energy);
    return finish(root, (_dt, time) => {
      hang.rotation.x = Math.sin(time * pace) * swing;
      if (drop) {
        const fall = (time * mix(0.25, 0.8, mood.energy)) % 1;
        drop.position.y = mix(top + span * 0.45, top - span * 0.45, fall * fall);
      }
    }, three ? 0.26 : 0.17);
  },
});
