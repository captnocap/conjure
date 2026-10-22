import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';
import { MEDIA, TAU, agarPad, dome, dryingCracks, gloss, wobble } from './plate';

const PIGMENTS = {
  cream: 'Opaque cream-white, like drops of spilt custard.',
  gold: 'Golden yellow, buttery and bright.',
  pink: 'Soft salmon pink.',
  red: 'Deep blood-red pigment, almost theatrical.',
  green: 'Dark colonies with a metallic green sheen, like beetle shell.',
  violet: 'Inky violet, staining the gel around it.',
  grey: 'Translucent grey-white, barely there, like a drop of glue.',
} as const;
const PIGMENT_COLOUR: Record<keyof typeof PIGMENTS, string> = {
  cream: '#efe4c4', gold: '#f0b92a', pink: '#f09a8c', red: '#b3182a', green: '#3c9a4c', violet: '#4a2a78', grey: '#c9cdc4',
};

export default defineThing({
  questions: {
    arrangement: choice('How are the colonies arranged?', {
      single: 'One great colony alone, a single hill.',
      scatter: 'A scatter of separate colonies of different sizes, like a range of low hills.',
      streak: 'A zigzag streak: a crowded ridge that thins out into isolated colonies at its far end.',
      satellites: 'One large colony ringed by tiny satellite colonies.',
      lawn: 'A solid sheet of growth covering one side, breaking into single colonies at its edge.',
    }),
    form: choice('What shape are the colonies?', {
      smooth: 'Smooth, round, glossy domes with clean edges.',
      wrinkled: 'Dry, wrinkled and folded like a brain or a dried apricot.',
      spreading: 'Flat and spreading, with lobed, creeping margins.',
      'fried-egg': 'A flat skirt with a raised central nipple, like a fried egg.',
      mucoid: 'Tall, wet and slimy, bulging as if about to run.',
      rhizoid: 'Flat with a ragged, root-like fringe reaching outward.',
    }),
    pigment: choice('What colour are they?', PIGMENTS),
    medium: choice('What agar are they growing on?', MEDIA),
    story: choice('What has happened on this patch?', {
      fresh: 'Nothing yet: clean overnight growth, textbook.',
      picked: 'One colony has been stabbed and sampled, leaving a dark pit and a drag mark.',
      intruder: 'A fuzzy grey-green mould has landed among them: contamination.',
      merged: 'Left too long: the colonies have swollen and run into each other.',
      halo: 'Each colony sits in a pale cleared halo where it has dissolved the gel around it.',
      sector: 'A wedge of the growth has mutated to a different colour.',
      circled: 'Someone has ringed one colony in marker and numbered it.',
    }),
    size: score('How large are the colonies?', ['Pinpoints', 'Lentils', 'Coins', 'Swollen giants']),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const padR = 24;
    const top = agarPad(s, padR, a.medium);
    dryingCracks(s, padR, top, Math.max(0, mood.wear - 0.45) * 1.8);

    const base = new THREE.Color(PIGMENT_COLOUR[a.pigment]);
    base.offsetHSL(0, (mood.cheer - 0.5) * 0.2, 0);
    const dry = a.form === 'wrinkled' || a.form === 'rhizoid';
    const options: THREE.MeshPhysicalMaterialParameters = { vertexColors: true, roughness: dry ? 0.7 : mix(0.12, 0.4, mood.wear), clearcoat: dry ? 0.1 : 1 };
    if (a.pigment === 'green') Object.assign(options, { metalness: 0.55, roughness: 0.22, emissive: '#1d5a22', emissiveIntensity: 0.3 });
    if (a.pigment === 'grey') Object.assign(options, { transparent: true, opacity: 0.8 });
    const living = gloss('#ffffff', options);
    const mutant = new THREE.Color(base).offsetHSL(0.45, 0.1, a.pigment === 'cream' || a.pigment === 'grey' ? -0.3 : 0.18);
    const swollen = a.story === 'merged' ? 1.45 : 1;
    const colonies: THREE.Mesh[] = [];
    const placed: { x: number; z: number; r: number }[] = [];

    const colony = (x: number, z: number, r: number, detail = 1, sector = false) => {
      const edge = wobble(random, 4, 2), fold = wobble(random, 3, 9), lobes = wobble(random, 3, 3);
      const sectorAt = random() * TAU, sectorWide = 0.5 + random() * 0.5;
      const outline = (angle: number) => {
        if (a.form === 'wrinkled') return r * (1 + 0.06 * edge(angle) + 0.05 * fold(angle));
        if (a.form === 'spreading') return r * (0.82 + 0.3 * lobes(angle) + 0.06 * fold(angle));
        if (a.form === 'rhizoid') return r * (0.6 + 0.4 * Math.abs(fold(angle)) ** 0.7 + 0.12 * lobes(angle));
        return r * (1 + 0.035 * edge(angle));
      };
      const profile = (t: number, angle: number) => {
        const round = Math.sqrt(Math.max(0, 1 - t * t));
        if (a.form === 'smooth') return r * 0.42 * round;
        if (a.form === 'mucoid') return r * 0.72 * round ** 0.55 * (1 + 0.08 * edge(angle) * t);
        if (a.form === 'wrinkled') return r * (0.3 * round ** 0.8 + 0.07 * Math.sin(t * 17 + fold(angle) * 2.5) * (1 - t) + 0.07 * fold(angle * 2) * t * (1 - t) * 4);
        if (a.form === 'spreading') return r * 0.13 * (1 - t ** 5) * (1 + 0.25 * Math.cos(t * 12));
        if (a.form === 'fried-egg') return r * (0.09 * (1 - t ** 6) + 0.34 * Math.exp(-((t / 0.32) ** 2)));
        return r * 0.1 * (1 - t ** 3) * (1 + 0.5 * Math.abs(fold(angle)) * t);
      };
      const tint = (t: number, angle: number) => {
        const c = base.clone();
        if (sector && Math.abs(((angle - sectorAt + TAU * 1.5) % TAU) - Math.PI) < sectorWide && t > 0.12) c.copy(mutant);
        if (a.form === 'fried-egg') c.offsetHSL(0, 0, t < 0.36 ? -0.1 : 0.05);
        if (a.pigment === 'green') c.lerp(new THREE.Color('#1c1420'), Math.max(0, 0.75 - t * 1.6));
        else c.offsetHSL(0, 0, (t - 0.5) * (dry ? -0.12 : 0.08));
        return c;
      };
      const mesh = s.mesh(dome(outline, profile, Math.round(mix(6, 14, detail)), Math.round(mix(20, 56, detail)), tint), living, [x, top, z]);
      mesh.rotation.y = random() * TAU;
      colonies.push(mesh);
      placed.push({ x, z, r });
      return mesh;
    };
    const free = (x: number, z: number, r: number, gap = 0.6) =>
      Math.hypot(x, z) + r < padR - 1.5 && placed.every((other) => Math.hypot(other.x - x, other.z - z) > (other.r + r) * (a.story === 'merged' ? 0.7 : 1) + (a.story === 'merged' ? 0 : gap));
    const sow = (count: number, rMin: number, rMax: number, within = padR, cx = 0, cz = 0) => {
      for (let i = 0, tries = 0; i < count && tries < count * 30; tries++) {
        const r = mix(rMin, rMax, random() ** 1.7) * swollen, angle = random() * TAU, d = Math.sqrt(random()) * within;
        const x = cx + Math.cos(angle) * d, z = cz + Math.sin(angle) * d;
        if (!free(x, z, r)) continue;
        colony(x, z, r, r > 3 ? 0.6 : 0.25, a.story === 'sector' && i < 3);
        i++;
      }
    };

    const big = mix(1.6, 6.5, a.size);
    if (a.arrangement === 'single') {
      colony(0, 0, mix(7, 15, a.size) * (a.story === 'merged' ? 1.15 : 1), 1, a.story === 'sector');
      if (a.story === 'merged') sow(5, 2, 4.5);
    } else if (a.arrangement === 'scatter') {
      sow(Math.round(mix(5, 26, mood.density)), big * 0.3, big);
    } else if (a.arrangement === 'satellites') {
      const r = mix(5, 9, a.size);
      colony(0, 0, r, 1, a.story === 'sector');
      const ring = Math.round(mix(7, 20, mood.density));
      for (let i = 0; i < ring; i++) {
        const angle = (i / ring) * TAU + random() * 0.3, d = r * swollen + 2.5 + random() * 6;
        const sr = mix(0.5, 1.3, random()) * swollen;
        if (free(Math.cos(angle) * d, Math.sin(angle) * d, sr, 0.3)) colony(Math.cos(angle) * d, Math.sin(angle) * d, sr, 0.15);
      }
    } else if (a.arrangement === 'streak') {
      // A loop dragged in zigzags: the first strokes are a solid ridge, the last leave single cells.
      const beads: { at: [number, number, number]; size: number }[] = [];
      const strokes = 7;
      for (let k = 0; k < strokes; k++) {
        const z = mix(-padR * 0.62, padR * 0.62, k / (strokes - 1)), half = Math.sqrt(Math.max(1, (padR * 0.82) ** 2 - z * z));
        const thin = k / (strokes - 1);
        const steps = Math.round(mix(34, 5, thin ** 0.7) * mix(0.7, 1.2, mood.density));
        for (let i = 0; i < steps; i++) {
          const x = mix(-half, half, (i + random() * 0.7) / steps) * (k % 2 ? -1 : 1), zz = z + (random() - 0.5) * 1.6 + Math.sin(x * 0.2 + k) * 0.8;
          if (thin < 0.5) beads.push({ at: [x, top, zz], size: mix(1.5, 0.9, thin) * (0.7 + random() * 0.6) * swollen });
          else {
            const r = mix(0.9, big * 0.75, (thin - 0.5) * 2 * random()) * swollen;
            if (free(x, zz, r, 0.2)) colony(x, zz, r, 0.3, a.story === 'sector' && r > 2);
          }
        }
      }
      const ridge = s.scatter(new THREE.SphereGeometry(1, 12, 6, 0, TAU, 0, Math.PI / 2), gloss(base, { roughness: options.roughness, clearcoat: options.clearcoat, metalness: options.metalness ?? 0 }), beads);
      ridge.scale.y = a.form === 'spreading' || a.form === 'rhizoid' ? 0.3 : 0.6;
      ridge.position.y = top * (1 - ridge.scale.y);
    } else {
      // A lawn: one sheet with a ragged shoreline, shedding colonies into open gel.
      const shore = wobble(random, 5, 3);
      const cx = -padR * 0.5;
      const reach = (angle: number) => {
        let d = 0;
        for (; d < padR * 2; d += 0.25) {
          const x = cx + Math.cos(angle) * d, z = Math.sin(angle) * d;
          if (Math.hypot(x, z) > padR * 0.95 || -x * 0.8 - z * 0.25 - padR * 0.12 + shore(z * 0.3) * 3 < 0) break;
        }
        return Math.max(0.5, d);
      };
      const sheet = s.mesh(dome(reach, (t, angle) => 0.85 * (1 - t ** 8) * (1 + 0.12 * Math.sin(angle * 9 + t * 11)), 14, 120, () => base), living, [cx, top, 0]);
      colonies.push(sheet);
      for (let i = 0, tries = 0; i < Math.round(mix(6, 18, mood.density)) && tries < 400; tries++) {
        const angle = random() * TAU, d = Math.sqrt(random()) * padR, x = Math.cos(angle) * d, z = Math.sin(angle) * d;
        const inside = -x * 0.8 - z * 0.25 - padR * 0.12;
        const r = mix(0.7, big * 0.7, random() ** 2) * swollen;
        if (inside > -r - 0.5 || inside < -16 || !free(x, z, r)) continue;
        colony(x, z, r, 0.3, a.story === 'sector' && r > 2);
        i++;
      }
    }

    const largest = placed.slice().sort((p, q) => q.r - p.r)[0] ?? { x: 0, z: 0, r: 4 };
    if (a.story === 'picked') {
      const height = a.form === 'smooth' ? 0.4 : a.form === 'mucoid' ? 0.68 : 0.2;
      s.ball([largest.r * 0.3, largest.r * 0.1, largest.r * 0.24], [largest.x + largest.r * 0.15, top + largest.r * height, largest.z + largest.r * 0.2], s.material('#2b1d18', { roughness: 0.5 }), 14);
      const smear = gloss(base, { transparent: true, opacity: 0.75, roughness: 0.3 });
      for (let i = 0; i < 6; i++) s.ball([largest.r * 0.16 * (1 - i * 0.12), 0.12, largest.r * 0.1], [largest.x + largest.r * (1.1 + i * 0.28), top + 0.05, largest.z + largest.r * (0.5 + i * 0.1)], smear, 10).castShadow = false;
    }
    if (a.story === 'halo') {
      const clear = new THREE.MeshStandardMaterial({ color: a.medium === 'blood' ? '#e8b06a' : '#fff6da', transparent: true, opacity: 0.55, roughness: 0.3, depthWrite: false, emissive: '#ffe9b0', emissiveIntensity: 0.5 });
      for (const p of placed.filter((q) => q.r > 0.9)) {
        const halo = s.mesh(new THREE.CircleGeometry(p.r * 1.45 + 1.1, 32), clear, [p.x, top + 0.04, p.z]);
        halo.rotation.x = -Math.PI / 2;
        halo.castShadow = false;
      }
    }
    if (a.story === 'intruder') {
      let x = 0, z = 0;
      for (let i = 0; i < 60; i++) { const angle = random() * TAU; x = Math.cos(angle) * padR * 0.55; z = Math.sin(angle) * padR * 0.55; if (free(x, z, 4.5, 0)) break; }
      const felt = s.material('#ffffff', { roughness: 1, vertexColors: true });
      const edge = wobble(random, 4, 3);
      s.mesh(dome((angle) => 5.5 * (1 + 0.08 * edge(angle)), (t) => 0.9 * Math.sqrt(1 - t * t) + 0.15 * Math.cos(t * 16) * (1 - t), 10, 40,
        (t) => (t > 0.8 ? '#f1f1ea' : t > 0.55 ? '#7fa59a' : t > 0.3 ? '#4f8478' : '#6f9b86')), felt, [x, top, z]);
      const hairs = Array.from({ length: 50 }, () => { const angle = random() * TAU, d = Math.sqrt(random()) * 4.2; return { at: [x + Math.cos(angle) * d, top + 1 + random() * 0.5, z + Math.sin(angle) * d] as [number, number, number], size: 0.16 + random() * 0.14 }; });
      s.scatter(new THREE.SphereGeometry(1, 6, 4), s.material('#3f7468', { roughness: 1 }), hairs);
    }
    if (a.story === 'circled') {
      const ink = s.material('#1c2f8a', { roughness: 0.6 });
      const loop = s.ring(largest.r * 1.3 + 1, 0.22, [largest.x + 0.4, top + 0.12, largest.z - 0.3], ink, TAU * 0.93);
      loop.rotation.x = -Math.PI / 2;
      loop.rotation.z = random() * TAU;
      loop.castShadow = false;
      const tag = s.label(`#${1 + Math.floor(random() * 9)}`, 4.5, 3, [largest.x + largest.r * 1.3 + 3.6, top + 0.1, largest.z - largest.r * 0.6], '#1c2f8a', '#f7f3df');
      tag.rotation.x = -Math.PI / 2;
      tag.rotation.z = (random() - 0.5) * 0.4;
    }

    s.root.scale.setScalar(0.01);
    const pulse = mix(0.2, 1.6, mood.energy);
    return s.finish({
      update: (_dt, time) => colonies.forEach((mesh, i) => { mesh.scale.y = 1 + 0.035 * Math.sin(time * pulse + i * 1.7); }),
    });
  },
});
