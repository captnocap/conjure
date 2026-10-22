import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul, score } from '@conjure/kit';

type P3 = [number, number, number];
const LIGHT: Record<string, string[]> = {
  blue: ['#3d7fe6', '#5aa2f0'],
  red: ['#d6452c', '#e2703a'],
  green: ['#35b877', '#7fd09a'],
  gold: ['#e07a22', '#eda04a'],
  mixed: ['#3d7fe6', '#d6452c'],
};

export default defineThing({
  questions: {
    form: choice('What form do the lensed images take?', {
      ring: 'A near-complete Einstein ring, one thin circle with a small gap.',
      cross: 'A four-point cross: the same object seen four times round the lens.',
      smile: 'A broken smile: one long arc below, a short one above and two bright eyes, like a grinning face.',
      streaks: 'Several long thin streaks at different distances, like scratches on a lens.',
      double: 'Two rings, one inside the other, from two galaxies lined up behind.',
    }),
    light: choice('What colour is the lensed light?', {
      blue: 'Electric blue, a young galaxy full of new stars.',
      red: 'Deep red, light that has travelled almost the whole age of the universe.',
      green: 'Unnatural green, glowing gas.',
      gold: 'Amber, a warm echo of the lens itself.',
      mixed: 'Blue and red together, two different things folded into one image.',
    }),
    distortion: score('How distorted is the image?', ['Crisp hair-thin arcs', 'Clean but uneven', 'Smeared and lumpy', 'Fat, wobbling and barely holding a shape']),
    lens: choice('What is doing the bending?', {
      giant: 'One massive smooth elliptical galaxy.',
      pair: 'Two galaxies close together, sharing the work.',
      group: 'A giant with a handful of small companions huddled round it.',
      disc: 'An edge-on disc galaxy with a dark dust lane across it.',
    }),
    behind: choice('What is being seen through it?', {
      galaxy: 'An ordinary galaxy: the arcs are beaded with clumps of stars.',
      quasar: 'A quasar: hard bright points with spikes sit on the arcs.',
      supernova: 'An exploding star: one of the repeated images has flared far brighter than its twins, the same moment arriving late.',
    }),
    field: noul('Are other faint background galaxies smeared into little tangential dashes around it?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const RE = 1.75;
    const d = a.distortion;
    const colours = LIGHT[a.light];
    const paints = colours.map((colour) => new THREE.MeshStandardMaterial({ color: new THREE.Color(colour).lerp(new THREE.Color('#77717f'), (1 - mood.cheer) * 0.25), emissive: colour, emissiveIntensity: mix(0.35, 0.8, mood.cheer), roughness: 0.5 }));
    const glowPaints = colours.map((colour) => new THREE.MeshBasicMaterial({ color: colour, transparent: true, opacity: 0.2, depthWrite: false }));

    /** A tapered, lumpy arc in the xy plane: thin at its tips, fattest in the middle. */
    const arc = (radius: number, start: number, sweep: number, width: number, paint: number, glow = true) => {
      const closed = sweep > Math.PI * 1.97;
      const n = Math.max(16, Math.ceil(sweep * radius * 9)), m = 8;
      const p1 = random() * 6.28, p2 = random() * 6.28, p3 = random() * 6.28;
      const build = (fatten: number, depth: number) => {
        const positions: number[] = [], index: number[] = [];
        for (let i = 0; i <= n; i++) {
          const u = i / n, angle = start + sweep * u;
          const taper = closed ? 1 : Math.pow(Math.sin(Math.PI * u), 0.55);
          const lump = 1 + d * (0.36 * Math.sin(u * sweep * 5 + p1) + 0.24 * Math.sin(u * sweep * 11 + p2));
          const w = Math.max(0.004, width * taper * lump * fatten);
          const r = radius * (1 + d * 0.07 * Math.sin(u * sweep * 3 + p3));
          for (let j = 0; j < m; j++) {
            const turn = j / m * Math.PI * 2, out = r + w * Math.cos(turn);
            positions.push(Math.cos(angle) * out, Math.sin(angle) * out, w * depth * Math.sin(turn));
          }
        }
        for (let i = 0; i < n; i++) for (let j = 0; j < m; j++) {
          const p = i * m + j, q = i * m + (j + 1) % m;
          index.push(p, p + m, q, q, p + m, q + m);
        }
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        geometry.setIndex(index);
        geometry.computeVertexNormals();
        return geometry;
      };
      s.mesh(build(1, 0.7), paints[paint % paints.length]);
      if (glow) s.mesh(build(2.1, 0.5), glowPaints[paint % paints.length]).castShadow = false;
    };
    const width = mix(0.035, 0.115, d);
    const images: P3[] = [];
    const onRing = (radius: number, angle: number): P3 => [Math.cos(angle) * radius, Math.sin(angle) * radius, 0];
    const spin = random() * Math.PI * 2;

    if (a.form === 'ring') {
      const gap = mix(0.25, 0.9, random());
      arc(RE, spin, Math.PI * 2 - gap, width, 0);
      if (a.light === 'mixed') arc(RE * 1.13, spin + 2, 1.5, width * 0.7, 1);
      for (let k = 0; k < 4; k++) images.push(onRing(RE, spin + 0.6 + k * 1.45));
    } else if (a.form === 'cross') {
      for (let k = 0; k < 4; k++) {
        const angle = spin + k * Math.PI / 2 + (random() - 0.5) * 0.25, radius = RE * (k % 2 ? 0.86 : 1.06);
        const sweep = mix(0.3, 0.8, d);
        arc(radius, angle - sweep / 2, sweep, width * 1.15, k);
        images.push(onRing(radius, angle));
      }
      s.ring(RE * 0.96, 0.012, [0, 0, 0], glowPaints[0]).castShadow = false;
    } else if (a.form === 'smile') {
      const tilt = (random() - 0.5) * 0.35;
      arc(RE, -Math.PI / 2 - 1.25 + tilt, 2.5, width * 1.2, 0);
      arc(RE * 1.02, Math.PI / 2 - 0.55 + tilt, 1.1, width * 0.85, 1);
      arc(RE * 1.22, Math.PI * 0.86 + tilt, 0.7, width * 0.6, 1);
      images.push(onRing(RE, -Math.PI / 2 + tilt - 0.7), onRing(RE, -Math.PI / 2 + tilt + 0.6), onRing(RE * 1.02, Math.PI / 2 + tilt));
    } else if (a.form === 'streaks') {
      const count = 4 + Math.floor(random() * 3);
      for (let k = 0; k < count; k++) {
        const radius = RE * mix(0.8, 1.55, k / (count - 1)), angle = spin + k * 2.4 + random(), sweep = mix(0.6, 1.5, random()) * (RE / radius);
        arc(radius, angle, sweep, width * mix(0.6, 1.1, random()), k);
        images.push(onRing(radius, angle + sweep / 2));
      }
    } else {
      arc(RE * 0.72, spin, Math.PI * 2 - 0.5, width * 0.85, 0);
      arc(RE * 1.2, spin + 2.6, Math.PI * 2 - 1.4, width, 1);
      images.push(onRing(RE * 0.72, spin + 1), onRing(RE * 0.72, spin + 4), onRing(RE * 1.2, spin + 3.6), onRing(RE * 1.2, spin + 5.8));
    }

    // What the source is shows up as what punctuates the arcs.
    const white = new THREE.MeshBasicMaterial({ color: '#fffdf2' });
    if (a.behind === 'galaxy') {
      const knots: { at: P3; size: number; color: string }[] = [];
      for (const [x, y] of images) for (let k = 0; k < 7; k++) {
        const angle = Math.atan2(y, x) + (random() - 0.5) * 0.5, radius = Math.hypot(x, y) + (random() - 0.5) * width * 1.4;
        knots.push({ at: [Math.cos(angle) * radius, Math.sin(angle) * radius, (random() - 0.5) * width], size: width * mix(0.5, 1.2, random()) + 0.02, color: random() < 0.6 ? '#fff3d0' : '#ffb7c8' });
      }
      s.scatter(new THREE.IcosahedronGeometry(1, 1), new THREE.MeshBasicMaterial({ color: '#ffffff' }), knots);
    } else {
      images.forEach((at, index) => {
        const flare = a.behind === 'supernova' && index === 0;
        if (a.behind === 'supernova' && !flare && index > 2) return;
        const size = flare ? 0.2 : a.behind === 'quasar' ? 0.1 : 0.06;
        s.ball([size, size, size], at, white, 14);
        s.ball([size * 2.4, size * 2.4, size * 2.4], at, new THREE.MeshBasicMaterial({ color: flare ? '#ffd27a' : '#cfe4ff', transparent: true, opacity: 0.35, depthWrite: false }), 14).castShadow = false;
        if (flare || a.behind === 'quasar') for (let k = 0; k < 4; k++) {
          const angle = k * Math.PI / 2 + 0.4, reach = size * (flare ? 5.5 : 4);
          s.rod(at, [at[0] + Math.cos(angle) * reach, at[1] + Math.sin(angle) * reach, at[2]], size * 0.22, white, 0.002);
        }
      });
    }

    // The lens itself: warm, heavy and perfectly ordinary.
    const gold = new THREE.MeshStandardMaterial({ color: '#f1c65a', emissive: '#d8962a', emissiveIntensity: mix(0.4, 0.8, mood.warmth), roughness: 0.6 });
    const halo = (at: P3, radius: number, opacity: number) => { s.ball([radius, radius * 0.85, radius * 0.6], at, new THREE.MeshBasicMaterial({ color: '#f4c24e', transparent: true, opacity, depthWrite: false }), 20).castShadow = false; };
    if (a.lens === 'giant' || a.lens === 'group') {
      s.ball([0.62, 0.5, 0.45], [0, 0, 0], gold, 28).rotation.z = 0.35;
      halo([0, 0, 0], 0.95, 0.24); halo([0, 0, 0], 1.3, 0.12);
      if (a.lens === 'group') for (let k = 0; k < 5; k++) {
        const angle = random() * 6.28, radius = 0.75 + random() * 0.5, size = 0.1 + random() * 0.1;
        s.ball([size * 1.3, size, size], [Math.cos(angle) * radius, Math.sin(angle) * radius, (random() - 0.5) * 0.5], gold, 14).rotation.z = random() * 3;
      }
    } else if (a.lens === 'pair') {
      for (const side of [-1, 1]) { const at: P3 = [side * 0.42, side * 0.16, side * 0.1]; s.ball([0.4, 0.33, 0.32], at, gold, 22).rotation.z = side * 0.5; halo(at, 0.62, 0.2); }
      halo([0, 0, 0], 1.25, 0.12);
    } else {
      const disc = new THREE.Group();
      const body = new THREE.Mesh(new THREE.SphereGeometry(1, 28, 14), gold); body.scale.set(1.05, 0.13, 0.5); body.castShadow = true;
      const bulge = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 12), gold); bulge.scale.set(0.34, 0.27, 0.3); bulge.castShadow = true;
      const lane = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.035, 0.08), new THREE.MeshStandardMaterial({ color: '#4a3324', roughness: 0.9 })); lane.position.z = 0.47;
      disc.add(body, bulge, lane);
      disc.rotation.z = (random() - 0.5) * 1.2;
      s.root.add(disc);
      halo([0, 0, 0], 1.2, 0.13);
    }

    if (a.field) {
      const count = Math.round(mix(18, 46, mood.density));
      const dashes = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 1), new THREE.MeshBasicMaterial({ color: '#ffffff' }), count);
      const matrix = new THREE.Matrix4(), turn = new THREE.Quaternion(), scale = new THREE.Vector3(), at = new THREE.Vector3();
      const tints = ['#6f8fd8', '#c9783a', '#8a6fc4', '#d8a43a', ...colours];
      for (let i = 0; i < count; i++) {
        const angle = random() * Math.PI * 2, radius = RE * mix(1.3, 2.05, Math.sqrt(random()));
        const size = 0.035 + random() * 0.04, shear = 1 + mix(1.2, 5, d) * (RE / radius) ** 3;
        at.set(Math.cos(angle) * radius, Math.sin(angle) * radius, (random() - 0.5) * 0.5);
        turn.setFromAxisAngle(new THREE.Vector3(0, 0, 1), angle + Math.PI / 2);
        scale.set(size * shear, size * 0.75, size * 0.75);
        dashes.setMatrixAt(i, matrix.compose(at, turn, scale));
        dashes.setColorAt(i, new THREE.Color(tints[Math.floor(random() * tints.length)]));
      }
      dashes.instanceMatrix.needsUpdate = true;
      if (dashes.instanceColor) dashes.instanceColor.needsUpdate = true;
      s.root.add(dashes);
    }

    // Leaned back a little, like a mirror on a stand, so the ring faces a raised camera.
    s.root.rotation.x = -0.28;
    return s.finish();
  },
});
