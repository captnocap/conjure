import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul, score } from '@conjure/kit';
import { plasmaPaint, strand, vec } from './plasma';

const LIGHTS = {
  gold: 'Gold and orange visible light, white-hot at the feet.',
  halpha: 'Deep hydrogen-alpha red, the colour of a prominence through a filter.',
  euv: 'Extreme-ultraviolet false colour: electric blue-white.',
  green: 'The green coronal line of hot iron, eerie and cool.',
} as const;
const TONES: Record<keyof typeof LIGHTS, { base: string; crown: string; halo: string; foot: string }> = {
  gold: { base: '#fff0cc', crown: '#f04e00', halo: '#ff7a10', foot: '#fff0c0' },
  halpha: { base: '#ffd9c8', crown: '#b41a08', halo: '#f23a1c', foot: '#ffcfbc' },
  euv: { base: '#e6f4ff', crown: '#1457d8', halo: '#3a8cff', foot: '#dcefff' },
  green: { base: '#e4ffe8', crown: '#0c7a3c', halo: '#2cc46c', foot: '#d6ffe2' },
};

export default defineThing({
  questions: {
    bundle: choice('How many loops are there?', {
      tangle: 'Loops crossing at different angles, a nest of them.',
      single: 'One great lone arch.',
      sheaf: 'A tight bundle of parallel loops, almost one thick rope.',
      arcade: 'A row of loops side by side, a tunnel of light.',
    }),
    shape: choice('What shape is the arch?', {
      low: 'Low and wide, a squat bridge.',
      round: 'A clean semicircle.',
      tall: 'Tall and narrow, reaching high.',
      twisted: 'A loop with a visible helical twist winding round it.',
    }),
    light: choice('What light is it seen in?', LIGHTS),
    feet: choice('What anchors its footpoints?', {
      spots: 'Two dark sunspots, each ringed with a brown penumbra.',
      plage: 'Blazing white plage, bright patches of surface.',
      ragged: 'Frayed feet spreading into a brush of fine fibrils.',
      pores: 'Small dark pores, barely there.',
    }),
    doing: choice('What is it doing right now?', {
      rising: 'Just emerged: bright knots still climbing its legs.',
      reconnecting: 'Reconnecting at the crown: a bright cusp with sparks thrown off.',
      raining: 'Coronal rain: cool blobs condensing at the top and sliding down both legs.',
      unravelling: 'One footpoint torn loose, the free leg lifting away.',
      steady: 'Holding steady, a long-lived loop.',
    }),
    span: score('How vast is it?', ['A small loop over one spot', 'Spanning a whole active region', 'A giant arch many worlds high']),
    backdrop: noul('Is there a fainter second set of loops behind it?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const tone = TONES[a.light];
    const W = mix(1.6, 4.4, a.span);
    const H = W * { low: 0.42, round: 0.55, tall: 0.95, twisted: 0.62 }[a.shape];
    const energy = mood.energy;
    const materials: THREE.ShaderMaterial[] = [];
    const paint = (options: Parameters<typeof plasmaPaint>[0]) => {
      const material = plasmaPaint(options);
      materials.push(material);
      return material;
    };
    const glow = mix(1.0, 1.3, mood.cheer);
    const crown = new THREE.Color(tone.crown).lerp(new THREE.Color('#4a2a1a'), mood.wear * 0.3);

    /** Points of one loop in the x-y plane, spanning `w`, rising `h`, standing at depth `z`. */
    const loop = (w: number, h: number, z: number, lean = 0, lift = 0) => {
      const points: THREE.Vector3[] = [];
      for (let i = 0; i <= 36; i++) {
        const t = i / 36, angle = Math.PI * t;
        const x = -w / 2 * Math.cos(angle) - lift * 0.18 * w * t * t;
        const y = h * Math.sin(angle) + lift * h * 0.5 * t * t;
        points.push(vec(x, y, z + lean * Math.sin(angle)));
      }
      return points;
    };

    interface LoopSpec { w: number; h: number; z: number; yaw: number; radius: number; main: boolean; body?: number }
    const specs: LoopSpec[] = [];
    const lift = a.doing === 'unravelling' ? 1 : 0;
    if (a.bundle === 'single') {
      specs.push({ w: W, h: H, z: 0, yaw: 0, radius: 0.045 * W, main: true });
      for (const dz of [-0.1, 0.12, -0.17]) specs.push({ w: W * (1 + dz * 0.5), h: H * (1 + dz * 0.6), z: dz * W, yaw: 0, radius: 0.012 * W, main: false, body: 0.45 });
    } else if (a.bundle === 'sheaf') {
      specs.push({ w: W, h: H, z: 0, yaw: 0, radius: 0.04 * W, main: true });
      const count = 6 + Math.floor(random() * 3);
      for (let i = 0; i < count; i++) {
        const dz = (random() - 0.5) * 0.22 * W, dh = (random() - 0.5) * 0.12;
        specs.push({ w: W * (1 + dh * 0.5), h: H * (1 + dh), z: dz, yaw: 0, radius: mix(0.012, 0.025, random()) * W, main: false, body: 0.65 });
      }
    } else if (a.bundle === 'arcade') {
      const count = 4 + Math.floor(random() * 3);
      for (let i = 0; i < count; i++) {
        const t = i / (count - 1);
        specs.push({ w: W * mix(0.85, 1.05, random()), h: H * mix(0.75, 1.1, random()), z: (t - 0.5) * W * 0.9, yaw: (random() - 0.5) * 0.12, radius: 0.028 * W, main: i === Math.floor(count / 2), body: 0.9 });
      }
    } else {
      const count = 4 + Math.floor(random() * 3);
      for (let i = 0; i < count; i++) {
        const k = i === 0 ? 1 : mix(0.6, 1.05, random());
        specs.push({ w: W * k, h: H * k * mix(0.8, 1.2, random()), z: (random() - 0.5) * 0.3 * W, yaw: i === 0 ? 0 : (random() - 0.5) * 2.2, radius: (i === 0 ? 0.04 : 0.024) * W, main: i === 0, body: 0.8 });
      }
    }

    const halo = paint({ base: tone.halo, crown: tone.halo, arch: 1, opacity: mix(0.6, 0.35, mood.wear), rim: 1, rimPower: 1.4, glow: 1.1, depthWrite: false, shimmer: 0.1, waves: 2, speed: 0.1 + energy * 0.3 });
    const feet: { x: number; z: number; yaw: number; w: number; main: boolean }[] = [];
    let mainCurve: THREE.CatmullRomCurve3 | null = null;
    let mainNode: THREE.Group | null = null;
    for (const spec of specs) {
      const node = new THREE.Group();
      node.rotation.y = spec.yaw;
      node.position.z = spec.z;
      s.root.add(node);
      const points = loop(spec.w, spec.h, 0, (random() - 0.5) * 0.06 * spec.w, spec.main ? lift : 0);
      const core = paint({
        base: tone.base, crown, arch: 1, gamma: spec.main ? 0.42 : 0.55, glow,
        shimmer: mix(0.1, 0.32, energy), waves: 2.5, speed: mix(0.08, 0.6, energy), phase: random() * 6.28,
        ...(spec.main ? {} : { opacity: spec.body ?? 0.5, depthWrite: (spec.body ?? 0.5) >= 0.6, fade: [0.08, 0.08] as const }),
      });
      const mesh = new THREE.Mesh(strand(points, { radius: (t) => spec.radius * (0.8 + 0.2 * Math.sin(Math.PI * t)), rings: 56, sides: 12 }), core);
      mesh.castShadow = spec.main;
      node.add(mesh);
      if (spec.main) {
        node.add(new THREE.Mesh(strand(points, { radius: (t) => spec.radius * 2.1 * (0.9 + 0.3 * Math.sin(Math.PI * t)), rings: 40, sides: 14 }), halo));
        mainCurve = new THREE.CatmullRomCurve3(points, false, 'centripetal');
        mainNode = node;
        if (a.shape === 'twisted') {
          // A thin bright rib wound helically around the core.
          const frames = mainCurve.computeFrenetFrames(72, false);
          const helix: THREE.Vector3[] = [];
          for (let i = 0; i <= 72; i++) {
            const t = i / 72, angle = t * Math.PI * 2 * 4.5;
            const p = mainCurve.getPointAt(t);
            helix.push(p.clone().addScaledVector(frames.normals[i], Math.cos(angle) * spec.radius * 1.7).addScaledVector(frames.binormals[i], Math.sin(angle) * spec.radius * 1.7));
          }
          node.add(new THREE.Mesh(strand(helix, { radius: () => spec.radius * 0.32, rings: 110, sides: 6 }), paint({ base: '#ffffff', crown: tone.base, glow: 1.3, arch: 1, shimmer: 0.2, waves: 6, speed: mix(0.1, 0.8, energy) })));
        }
      }
      if (spec.main || a.bundle === 'arcade' || (a.bundle === 'tangle' && random() < 0.6)) {
        feet.push({ x: -spec.w / 2, z: spec.z, yaw: spec.yaw, w: spec.w, main: spec.main });
        if (!(spec.main && lift)) feet.push({ x: spec.w / 2, z: spec.z, yaw: spec.yaw, w: spec.w, main: spec.main });
      }
    }

    // Footpoints on the surface.
    const umbra = s.material('#2a1a12', { roughness: 0.9 });
    const penumbra = s.material('#8a4a1e', { roughness: 0.85, emissive: '#5a2a0a', emissiveIntensity: 0.3 });
    const plage = new THREE.MeshBasicMaterial({ color: new THREE.Color(tone.foot).multiplyScalar(1.1) });
    const footGlow = paint({ base: tone.halo, crown: tone.foot, vertical: true, opacity: 0.5, rim: 1, rimPower: 1.2, depthWrite: false });
    for (const foot of feet) {
      const r = 0.08 * foot.w;
      const world = new THREE.Vector3(foot.x, 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), foot.yaw);
      world.z += foot.z;
      const flat = (radius: number, material: THREE.Material, y: number, inner = 0) => {
        const geometry = inner > 0 ? new THREE.RingGeometry(inner, radius, 28) : new THREE.CircleGeometry(radius, 28);
        const mesh = s.mesh(geometry, material, [world.x, y, world.z]);
        mesh.rotation.x = -Math.PI / 2;
        mesh.castShadow = false;
        return mesh;
      };
      if (a.feet === 'spots') {
        flat(r * 1.1, umbra, 0.012);
        flat(r * 2.2, penumbra, 0.006, r * 1.1);
        // Penumbral filaments as short dark spokes.
        const spokes = foot.main ? 16 : 0;
        for (let i = 0; i < spokes; i++) {
          const angle = (i / spokes) * Math.PI * 2 + random() * 0.2;
          const spoke = s.box([r * 0.08, 0.004, r * 1.0], [world.x + Math.cos(angle) * r * 1.6, 0.012, world.z + Math.sin(angle) * r * 1.6], umbra);
          spoke.rotation.y = -angle + Math.PI / 2;
          spoke.castShadow = false;
        }
      } else if (a.feet === 'plage') {
        // Plage is a ragged bright patch, not a disc: a few overlapping blots around the foot.
        flat(r * 1.3, plage, 0.01);
        const blots = foot.main ? 7 : 3;
        for (let i = 0; i < blots; i++) {
          const angle = random() * Math.PI * 2, reach = r * mix(0.6, 2.2, random());
          const blot = flat(r * mix(0.35, 0.9, random()), plage, 0.011);
          blot.position.add(new THREE.Vector3(Math.cos(angle) * reach, 0, Math.sin(angle) * reach));
          blot.scale.set(mix(0.7, 1.4, random()), 1, 1);
          blot.rotation.z = random() * Math.PI;
        }
      } else if (a.feet === 'ragged') {
        flat(r * 0.6, plage, 0.01);
        const fibril = paint({ base: tone.base, crown: tone.halo, opacity: 0.7, fade: [0, 0.5], depthWrite: false, glow: 1.1 });
        const count = foot.main ? 8 + Math.floor(random() * 5) : 3;
        for (let i = 0; i < count; i++) {
          const angle = random() * Math.PI * 2, reach = r * mix(1.2, 2.8, random());
          const points = [vec(world.x, 0.02, world.z), vec(world.x + Math.cos(angle) * reach * 0.5, r * 0.6 * random(), world.z + Math.sin(angle) * reach * 0.5), vec(world.x + Math.cos(angle) * reach, 0.03, world.z + Math.sin(angle) * reach)];
          const mesh = new THREE.Mesh(strand(points, { radius: (t) => r * 0.08 * (1 - t * 0.7), rings: 12, sides: 6 }), fibril);
          s.root.add(mesh);
        }
      } else {
        flat(r * 0.5, umbra, 0.012);
        flat(r * 0.3, umbra, 0.012).position.add(new THREE.Vector3(r * 0.7, 0, r * 0.4));
      }
      if (foot.main) {
        const ball = new THREE.Mesh(new THREE.SphereGeometry(r * 1.6, 24, 16), footGlow);
        ball.position.set(world.x, 0.02, world.z);
        ball.scale.y = 0.4;
        s.root.add(ball);
      }
    }

    // What it is doing: knots climbing, a reconnection cusp, rain, or a torn leg.
    const movers: { mesh: THREE.Object3D; t: number; rate: number }[] = [];
    const curve = mainCurve as THREE.CatmullRomCurve3 | null;
    const holder = mainNode as THREE.Group | null;
    const knotPaint = new THREE.MeshBasicMaterial({ color: new THREE.Color(tone.halo).lerp(new THREE.Color('#ffffff'), 0.25) });
    let sparks: THREE.InstancedMesh | null = null;
    const sparkSeeds: { x: number; y: number; z: number; rise: number; phase: number }[] = [];
    if (curve && holder) {
      if (a.doing === 'rising') {
        for (let i = 0; i < 6; i++) {
          const knot = new THREE.Mesh(new THREE.SphereGeometry(W * 0.042, 12, 8), knotPaint);
          holder.add(knot);
          movers.push({ mesh: knot, t: i % 2 ? 0.05 + random() * 0.3 : 0.95 - random() * 0.3, rate: (i % 2 ? 1 : -1) * mix(0.02, 0.12, energy) });
        }
      }
      if (a.doing === 'raining') {
        for (let i = 0; i < 10; i++) {
          const drop = new THREE.Mesh(new THREE.SphereGeometry(W * 0.022, 10, 8), s.material(tone.crown, { emissive: tone.crown, emissiveIntensity: 0.6 }));
          drop.scale.y = 1.6;
          holder.add(drop);
          movers.push({ mesh: drop, t: 0.3 + random() * 0.4, rate: (random() < 0.5 ? 1 : -1) * mix(0.03, 0.15, energy) });
        }
      }
      if (a.doing === 'reconnecting') {
        const top = curve.getPointAt(0.5);
        const cusp = new THREE.Mesh(new THREE.SphereGeometry(W * 0.06, 16, 12), knotPaint);
        cusp.position.copy(top).add(vec(0, W * 0.03, 0));
        holder.add(cusp);
        const spike = new THREE.OctahedronGeometry(1, 0);
        for (let i = 0; i < 9; i++) {
          const ray = new THREE.Mesh(spike, knotPaint);
          ray.position.copy(cusp.position);
          ray.scale.set(W * mix(0.08, 0.26, random()), W * 0.012, W * 0.012);
          ray.rotation.z = random() * Math.PI;
          ray.rotation.y = (random() - 0.5) * 0.8;
          holder.add(ray);
        }
        const count = 40;
        sparks = new THREE.InstancedMesh(spike, knotPaint, count);
        for (let i = 0; i < count; i++) sparkSeeds.push({ x: cusp.position.x + (random() - 0.5) * W * 0.5, y: cusp.position.y + random() * W * 0.35, z: (random() - 0.5) * W * 0.3, rise: mix(0.05, 0.25, random()) * W, phase: random() * 6.28 });
        holder.add(sparks);
      }
      if (a.doing === 'unravelling') {
        // Fraying threads trail from the free end.
        const end = curve.getPointAt(1), before = curve.getPointAt(0.93);
        const away = end.clone().sub(before).normalize();
        const thread = paint({ base: tone.halo, crown: tone.crown, opacity: 0.8, fade: [0, 0.6], depthWrite: false });
        for (let i = 0; i < 6; i++) {
          const drift = vec((random() - 0.5) * 0.5, random() * 0.6, (random() - 0.5) * 0.5).multiplyScalar(W * 0.25);
          const points = [before.clone(), end.clone().addScaledVector(away, W * 0.08), end.clone().addScaledVector(away, W * 0.22).add(drift)];
          holder.add(new THREE.Mesh(strand(points, { radius: (t) => W * 0.012 * (1 - t * 0.8), rings: 16, sides: 6 }), thread));
        }
      }
    }

    if (a.backdrop) {
      // Kept inside the main arch's envelope so the plinth's frame does not cut them off.
      const faint = paint({ base: tone.halo, crown: tone.crown, arch: 1, opacity: 0.35, depthWrite: false, fade: [0.1, 0.1], glow: 0.95 });
      const count = 3 + Math.floor(random() * 3);
      for (let i = 0; i < count; i++) {
        const k = mix(0.5, 0.92, random());
        const points = loop(W * k, H * k * mix(0.7, 1.05, random()), -W * mix(0.3, 0.6, random()), 0);
        const mesh = new THREE.Mesh(strand(points, { radius: () => W * 0.012, rings: 32, sides: 6 }), faint);
        mesh.position.x = (random() - 0.5) * W * 0.4;
        s.root.add(mesh);
      }
    }

    const sparkMatrix = new THREE.Matrix4();
    return s.finish({
      footprint: W * 0.5,
      update: (dt, time) => {
        for (const material of materials) material.uniforms.time.value = time;
        if (curve) {
          for (const mover of movers) {
            mover.t += mover.rate * dt;
            if (a.doing === 'rising') {
              if (mover.rate > 0 && mover.t > 0.5) mover.t = 0.02;
              if (mover.rate < 0 && mover.t < 0.5) mover.t = 0.98;
            } else {
              if (mover.t < 0.03) mover.t = 0.5 + random() * 0.1;
              if (mover.t > 0.97) mover.t = 0.5 - random() * 0.1;
            }
            mover.mesh.position.copy(curve.getPointAt(Math.min(0.999, Math.max(0.001, mover.t))));
          }
        }
        if (sparks) {
          sparkSeeds.forEach((seed, i) => {
            const climb = ((time * mix(0.05, 0.4, energy) + seed.phase) % 1);
            sparkMatrix.makeScale(W * 0.012, W * 0.03, W * 0.012).setPosition(seed.x + Math.sin(time + seed.phase) * W * 0.02, seed.y + climb * seed.rise, seed.z);
            sparks!.setMatrixAt(i, sparkMatrix);
          });
          sparks.instanceMatrix.needsUpdate = true;
        }
      },
    });
  },
});
