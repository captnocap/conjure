import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score, visibleBounds } from '@conjure/kit';

type P = [number, number, number];

const TINTS = {
  green: { description: 'Sickly yellow-green, the classic cartoon stink.', tint: '#9cc824', line: '#4e6a10' },
  yellow: { description: 'Sulphur yellow, eggy.', tint: '#e8cc14', line: '#7a6008' },
  brown: { description: 'Murky brown, something worse.', tint: '#8a6224', line: '#3e2a0c' },
  grey: { description: 'Grey-green, a swamp or a drain.', tint: '#7e9a5e', line: '#344a28' },
  purple: { description: 'A lurid purple-green, toxic and theatrical.', tint: '#a050c8', line: '#46205a' },
} as const;

export default defineThing({
  questions: {
    size: score('How big is the cloud?', ['A polite little puff', 'A fair-sized cloud', 'A room-filler']),
    colour: choice('What colour is it?', Object.fromEntries(Object.entries(TINTS).map(([key, value]) => [key, value.description])) as Record<keyof typeof TINTS, string>),
    shape: choice('What shape has it taken?', {
      puff: 'A round mushrooming puff.',
      streak: 'A long low streak trailing off to one side.',
      ring: 'A smoke ring, surprisingly neat.',
      ragged: 'A ragged scatter of separate blobs.',
      column: 'A tall rising column.',
    }),
    lines: choice('What rises off it?', {
      wavy: 'Wavy cartoon stink lines wobbling upward.',
      flies: 'Stink lines and a few circling flies.',
      none: 'Nothing: just the cloud.',
      skull: 'Stink lines and a tiny floating skull-and-crossbones.',
    }),
    drift: choice('Which way is it going?', {
      hanging: 'Hanging in place, going nowhere.',
      left: 'Streaming off to the left toward somebody.',
      right: 'Streaming off to the right toward somebody.',
      rising: 'Rising toward the ceiling.',
      floor: 'Creeping low along the floor.',
    }),
    stage: choice('How fresh is it?', {
      fresh: 'Fresh and dense, just let go.',
      spreading: 'Spreading out, thinner at the edges.',
      wisps: 'Nearly gone: a few last thin wisps.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const rnd = (lo: number, hi: number) => lo + (hi - lo) * random();
    const tint = TINTS[a.colour];
    const R = mix(0.16, 0.7, a.size) * { fresh: 0.9, spreading: 1.1, wisps: 1 }[a.stage];
    const glow = mix(0.3, 0.55, mood.cheer);
    const dir = a.drift === 'left' ? -1 : a.drift === 'right' ? 1 : 0;

    // ---- Where the blobs sit: a puff, a streak, a ring, a scatter or a column.
    const blobs: { at: P; r: number; phase: number }[] = [];
    const count = Math.round({ fresh: 18, spreading: 22, wisps: 10 }[a.stage] * mix(0.8, 1.2, mood.density));
    for (let i = 0; i < count; i++) {
      const t = i / count;
      let at: P, r = R * rnd(0.24, 0.42);
      if (a.shape === 'streak') at = [(t - 0.5) * R * 2.6, R * 0.3 + Math.sin(t * 6) * R * 0.12, rnd(-0.25, 0.25) * R];
      else if (a.shape === 'ring') { const ang = t * Math.PI * 2; r = R * 0.24; at = [Math.cos(ang) * R * 0.62, R * 0.45 + Math.sin(ang * 3) * R * 0.03, Math.sin(ang) * R * 0.62]; }
      else if (a.shape === 'ragged') at = [rnd(-1, 1) * R * 1.1, rnd(0.2, 0.9) * R, rnd(-1, 1) * R * 0.9];
      else if (a.shape === 'column') at = [rnd(-0.3, 0.3) * R * (1 - t * 0.5), t * R * 2.2 + R * 0.2, rnd(-0.3, 0.3) * R * (1 - t * 0.5)];
      else { const ang = random() * Math.PI * 2, d = Math.sqrt(random()) * R * 0.75; at = [Math.cos(ang) * d, R * 0.35 + rnd(0, 0.5) * R * (1 - d / R), Math.sin(ang) * d]; }
      // Streaming toward somebody: the cloud leans into a plume that thins toward its leading edge.
      if (dir) {
        const k = random();
        at[0] += dir * k * R * 1.3;
        at[1] += k * R * 0.25;
        r *= 1 - k * 0.45;
      }
      if (a.drift === 'floor') { at[1] *= 0.45; at[0] *= 1.25; r *= 1.1; }
      if (a.drift === 'rising') { at[1] *= 1.35; at[0] *= 0.8; at[2] *= 0.8; }
      at[1] = Math.max(at[1], r * 0.95);
      blobs.push({ at, r, phase: random() * 6.28 });
    }
    // The visible cloud is two layers of the same blobs: a translucent body that the frame can
    // measure, and a fainter, larger soft halo that writes no depth.
    const body = { fresh: 0.62, spreading: 0.48, wisps: 0.34 }[a.stage];
    const haze = { fresh: 0.24, spreading: 0.18, wisps: 0.12 }[a.stage];
    const bodyMaterial = new THREE.MeshStandardMaterial({ color: tint.tint, emissive: tint.tint, emissiveIntensity: glow * 1.15, transparent: true, opacity: body, depthWrite: true, roughness: 1 });
    const haloMaterial = new THREE.MeshStandardMaterial({ color: tint.tint, emissive: tint.tint, emissiveIntensity: glow, transparent: true, opacity: haze, depthWrite: false, roughness: 1 });
    const sphere = new THREE.SphereGeometry(1, 18, 12);
    const cloud = new THREE.Group();
    s.root.add(cloud);
    const layers = blobs.flatMap((b) => [true, false].map((solid) => {
      const mesh = new THREE.Mesh(sphere, solid ? bodyMaterial : haloMaterial);
      mesh.position.set(...b.at);
      mesh.scale.setScalar(b.r * (solid ? 0.82 : 1.14));
      mesh.castShadow = false;
      mesh.renderOrder = solid ? 1 : 2;
      cloud.add(mesh);
      return { mesh, solid, ...b };
    }));

    // ---- Escaping puffs: small faint blobs that leave the cloud and fade as they go.
    const strays: { mesh: THREE.Mesh; from: P; phase: number; r: number }[] = [];
    const strayMaterials: THREE.MeshStandardMaterial[] = [];
    const strayCount = a.stage === 'wisps' ? 3 : 6;
    for (let i = 0; i < strayCount; i++) {
      const b = blobs[Math.floor(random() * blobs.length)];
      const material = haloMaterial.clone();
      strayMaterials.push(material);
      const mesh = new THREE.Mesh(sphere, material);
      mesh.renderOrder = 3;
      mesh.castShadow = false;
      cloud.add(mesh);
      strays.push({ mesh, from: [...b.at] as P, phase: i / strayCount, r: b.r * rnd(0.35, 0.6) });
    }

    // ---- Stink lines: tall wobbling squiggles rising off the top, a few flies, or a little skull.
    const lines = new THREE.Group();
    s.root.add(lines);
    const lineMaterial = s.material(tint.line, { roughness: 0.5, emissive: tint.line, emissiveIntensity: 0.15 });
    const top = Math.max(...blobs.map((b) => b.at[1] + b.r * 0.7));
    const left = Math.min(...blobs.map((b) => b.at[0])), right = Math.max(...blobs.map((b) => b.at[0]));
    const wobbles: THREE.Mesh[] = [];
    if (a.lines !== 'none') {
      const n = a.stage === 'wisps' ? 2 : 3;
      for (let i = 0; i < n; i++) {
        const span = Math.min(right - left, R * 1.4);
        const x0 = (left + right) / 2 + (i / Math.max(1, n - 1) - 0.5) * span * 0.8 + rnd(-0.05, 0.05) * R, z0 = rnd(-0.25, 0.25) * R;
        const y0 = top - R * 0.2, amp = R * rnd(0.07, 0.1), rise = R * rnd(0.75, 1.0), phase = random() * 6;
        const points: P[] = [];
        for (let k = 0; k <= 16; k++) points.push([x0 + Math.sin(k * 0.72 + phase) * amp * 1.3 + dir * k / 16 * R * 0.2, y0 + k / 16 * rise, z0]);
        const tube = s.tube(points, R * 0.026, lineMaterial);
        s.root.remove(tube);
        lines.add(tube);
        wobbles.push(tube);
      }
    }
    const flies: THREE.Mesh[] = [];
    if (a.lines === 'flies') {
      const flyMaterial = s.material('#1c1c1a', { roughness: 0.5 });
      const wing = new THREE.MeshStandardMaterial({ color: '#e8eef0', transparent: true, opacity: 0.6, depthWrite: false });
      for (let i = 0; i < 4 + Math.floor(random() * 3); i++) {
        const fly = new THREE.Mesh(new THREE.SphereGeometry(R * 0.04, 8, 6), flyMaterial);
        fly.scale.set(1, 0.8, 1.4);
        for (const side of [-1, 1]) {
          const w = new THREE.Mesh(new THREE.SphereGeometry(R * 0.035, 6, 4), wing);
          w.scale.set(1.2, 0.2, 0.7);
          w.position.set(side * R * 0.04, R * 0.03, 0);
          fly.add(w);
        }
        fly.userData.orbit = { r: R * rnd(0.6, 1.0), y: top + rnd(-0.1, 0.5) * R, phase: random() * 6, speed: rnd(2, 4) * (random() < 0.5 ? 1 : -1) };
        lines.add(fly);
        flies.push(fly);
      }
    }
    if (a.lines === 'skull') {
      const bone = s.material('#f0ead8', { roughness: 0.6 });
      const skull = new THREE.Group();
      skull.position.set((left + right) / 2, top + R * 0.75, 0);
      const cap = new THREE.Mesh(new THREE.SphereGeometry(R * 0.16, 14, 10), bone); cap.castShadow = true; skull.add(cap);
      const jaw = new THREE.Mesh(new THREE.BoxGeometry(R * 0.18, R * 0.1, R * 0.14), bone); jaw.position.set(0, -R * 0.12, R * 0.03); skull.add(jaw);
      const dark = s.material('#1c1c1a');
      for (const x of [-1, 1]) { const eye = new THREE.Mesh(new THREE.SphereGeometry(R * 0.05, 8, 6), dark); eye.position.set(x * R * 0.065, R * 0.01, R * 0.13); skull.add(eye); }
      for (const t of [0.8, -0.8]) { const cross = new THREE.Mesh(new THREE.BoxGeometry(R * 0.5, R * 0.035, R * 0.035), bone); cross.position.set(0, -R * 0.25, 0); cross.rotation.z = t; skull.add(cross); }
      lines.add(skull);
      wobbles.push(cap);
    }

    // ---- Drift and thinning: the halo breathes, the body churns a little, strays leave and fade.
    const speed = mix(0.25, 0.9, mood.energy);
    const thing = s.finish({
      update(_dt, time) {
        for (const b of layers) {
          const swell = 1 + 0.07 * Math.sin(time * speed * 1.3 + b.phase);
          const wander = R * (b.solid ? 0.02 : 0.045);
          b.mesh.position.set(b.at[0] + Math.sin(time * speed * 0.7 + b.phase) * wander, b.at[1] + Math.sin(time * speed * 0.9 + b.phase * 1.7) * wander * 0.6, b.at[2] + Math.cos(time * speed * 0.6 + b.phase * 1.3) * wander);
          b.mesh.scale.setScalar(b.r * (b.solid ? 0.82 : 1.14 * swell));
        }
        strays.forEach((p, i) => {
          const t = ((time * speed * 0.18 + p.phase) % 1 + 1) % 1;
          const away = dir ? [dir, 0.25, 0] : a.drift === 'rising' ? [0, 1, 0] : a.drift === 'floor' ? [Math.cos(p.phase * 6.28), 0, Math.sin(p.phase * 6.28)] : [Math.cos(p.phase * 6.28) * 0.6, 0.6, Math.sin(p.phase * 6.28) * 0.6];
          p.mesh.position.set(p.from[0] + away[0] * t * R * 0.6, p.from[1] + away[1] * t * R * 0.6, p.from[2] + away[2] * t * R * 0.6);
          p.mesh.scale.setScalar(p.r * (1 + t * 0.8));
          strayMaterials[i].opacity = haze * 1.2 * Math.sin(Math.PI * t);
        });
        wobbles.forEach((tube, i) => { tube.position.x = Math.sin(time * (1.2 + i * 0.3) * speed * 2 + i) * R * 0.03; tube.position.y = Math.sin(time * 0.8 * speed * 2 + i * 1.7) * R * 0.03; });
        for (const fly of flies) {
          const o = fly.userData.orbit as { r: number; y: number; phase: number; speed: number };
          const ang = time * o.speed * speed * 2 + o.phase;
          fly.position.set((left + right) / 2 + Math.cos(ang) * o.r, o.y + Math.sin(ang * 2.3) * R * 0.08, Math.sin(ang) * o.r * 0.7);
          fly.rotation.y = -ang;
        }
      },
    });
    // Hover a little off the floor so it reads as gas, within what the frame allows.
    const bounds = visibleBounds(s.root);
    const height = bounds.isEmpty() ? R : bounds.max.y - bounds.min.y;
    if (a.drift !== 'floor') s.root.position.y += Math.min(0.15, height * 0.18);
    const dispose = thing.dispose;
    return { ...thing, footprint: R * 0.8, dispose: () => { for (const m of strayMaterials) m.dispose(); dispose(); } };
  },
});
