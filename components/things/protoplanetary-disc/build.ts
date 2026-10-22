import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul, score } from '@conjure/kit';
import { glow, hazePaint, makeNoise, star, vec } from './cosmos';

const DUSTS = {
  amber: 'Amber and rust, warm as lamplight on sand.',
  rose: 'Dusty rose and plum.',
  ice: 'Pale blue-grey ice and slate.',
  ember: 'Nearly black lanes with a furnace-orange heart, like cooling slag.',
  jade: 'Soft green and ochre, mossy and odd.',
} as const;
// Hot inner edge, main body, cold outer rim.
const DUST: Record<keyof typeof DUSTS, [string, string, string]> = {
  amber: ['#fff0b0', '#e8963c', '#7a3a1e'],
  rose: ['#ffe6d6', '#d9728c', '#5d2b4f'],
  ice: ['#ffffff', '#8fb4d6', '#3d4f6e'],
  ember: ['#ffd27a', '#c9471c', '#1f1416'],
  jade: ['#fff6c0', '#8fb46a', '#4a4a26'],
};

export default defineThing({
  questions: {
    gaps: choice('How many dark gaps have been swept in the disc?', {
      one: 'One broad gap: a single planet at work.',
      two: 'Two clear gaps, an inner and an outer.',
      several: 'Four neat gaps, rings like a target.',
      grooved: 'Dozens of hair-fine grooves, like a vinyl record.',
    }),
    dust: choice('What colour is the dust?', DUSTS),
    newcomer: choice('What can be seen forming in it?', {
      none: 'Nothing visible yet: only the lanes hint at planets.',
      clump: 'A bright crescent-shaped clump of dust piling up on one ring.',
      infant: 'One infant planet in a gap, with its own tiny ring and a wake behind it.',
      pair: 'Two infant planets in different gaps, siblings.',
      spiral: 'Two grand spiral arms winding through the disc, stirred by something unseen.',
    }),
    form: choice('What shape is the disc as a whole?', {
      flat: 'Perfectly flat, a pressed coin.',
      warped: 'Gently warped: the inner part tilts against the outer.',
      flared: 'Flared like a shallow bowl, thick at the rim.',
      broken: 'Broken: an inner ring tipped steeply out of the plane, like a gyroscope.',
    }),
    pose: choice('How is it presented?', {
      flat: 'Lying flat, seen from above like a record on a turntable.',
      tilted: 'Tilted, the classic telescope view.',
      upright: 'Standing on its rim and facing us, a target or a halo.',
    }),
    age: score('How far along is it?', ['Newborn: thick, smooth and full', 'Well carved into clean rings', 'Nearly cleared: thin rings and loose rubble']),
    jet: noul('Is the young star still firing a thin jet from its poles?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const noise = makeNoise(context.seed);
    const [hot, main, cold] = DUST[a.dust].map((hex) => new THREE.Color(hex));
    const outer = 3;
    const age = a.age;
    const disc = new THREE.Group();
    const inner = new THREE.Group();
    disc.add(inner);
    s.root.add(disc);
    const split = a.form === 'warped' ? 0.42 : a.form === 'broken' ? 0.34 : 0;
    if (a.form === 'warped') inner.rotation.set(0.3, 0, 0.12);
    if (a.form === 'broken') inner.rotation.set(1.0 + random() * 0.3, 0, 0.4);

    // Where the lanes are, as fractions of the radius.
    const lanes: { at: number; half: number }[] = [];
    const widen = mix(0.6, 1.7, age);
    if (a.gaps === 'one') lanes.push({ at: 0.55, half: 0.075 * widen });
    if (a.gaps === 'two') lanes.push({ at: 0.4, half: 0.05 * widen }, { at: 0.72, half: 0.055 * widen });
    if (a.gaps === 'several') for (const at of [0.3, 0.47, 0.64, 0.82]) lanes.push({ at, half: 0.032 * widen });
    if (a.gaps === 'grooved') for (let i = 0; i < 10; i++) lanes.push({ at: 0.2 + i * 0.078, half: 0.011 * widen });
    for (const lane of lanes) lane.at += (random() - 0.5) * 0.03;
    if (split) lanes.push({ at: split, half: 0.03 });
    lanes.sort((x, y) => x.at - y.at);
    const edges = [0.1, ...lanes.flatMap((lane) => [lane.at - lane.half, lane.at + lane.half]), 1];

    const thickness = (f: number) => (a.form === 'flared' ? 0.02 + 0.2 * f ** 2.2 : 0.03 + 0.03 * f) * mix(1.3, 0.6, age);
    const lift = (f: number) => (a.form === 'flared' ? 0.32 * f ** 2 : 0);
    const tone = (f: number, target: THREE.Color) => (f < 0.3 ? target.copy(hot).lerp(main, f / 0.3) : target.copy(main).lerp(cold, ((f - 0.3) / 0.7) ** 0.8));
    const bandPaint = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.8, emissive: main, emissiveIntensity: mix(0.12, 0.34, mood.cheer) });
    const spinners: { node: THREE.Object3D; rate: number }[] = [];
    const segments = 96;
    const shade = new THREE.Color();
    for (let band = 0; band + 1 < edges.length; band += 2) {
      const from = edges[band], to = edges[band + 1];
      if (to - from < 0.008) continue;
      const stripes = Math.max(1, Math.round((to - from) / 0.03));
      const profile: THREE.Vector2[] = [];
      const fractions: number[] = [];
      const stripeOf: number[] = [];
      const push = (f: number, y: number, stripe: number) => { profile.push(new THREE.Vector2(f * outer, y)); fractions.push(f); stripeOf.push(stripe); };
      push(from, lift(from) - thickness(from), 0);
      for (let stripe = 0; stripe < stripes; stripe++) {
        const f0 = mix(from, to, stripe / stripes), f1 = mix(from, to, (stripe + 1) / stripes);
        // Each stripe sits a hair higher or lower than its neighbour, which reads as grooves.
        const ridge = (stripe % 2 ? 0.012 : 0) * mix(1, 0.4, age);
        push(f0 + 0.0005, lift(f0) + thickness(f0) + ridge, stripe);
        push(f1 - 0.0005, lift(f1) + thickness(f1) + ridge, stripe);
      }
      push(to, lift(to) - thickness(to), stripes - 1);
      push(from, lift(from) - thickness(from), 0);
      const geometry = new THREE.LatheGeometry(profile, segments);
      const colours = new Float32Array((segments + 1) * profile.length * 3);
      const wobble = random() * 20;
      for (let i = 0; i <= segments; i++) {
        const angle = (i / segments) * Math.PI * 2;
        for (let j = 0; j < profile.length; j++) {
          const f = fractions[j];
          tone(f, shade);
          const streak = noise(Math.cos(angle) * 2.5 + wobble, Math.sin(angle) * 2.5, stripeOf[j] * 0.7 + band, 2);
          shade.multiplyScalar(1 + 0.22 * streak + (stripeOf[j] % 2 ? -0.1 : 0.06));
          colours.set([shade.r, shade.g, shade.b], (i * profile.length + j) * 3);
        }
      }
      geometry.setAttribute('color', new THREE.BufferAttribute(colours, 3));
      const mesh = new THREE.Mesh(geometry, bandPaint);
      mesh.castShadow = mesh.receiveShadow = true;
      (to <= split + 0.001 ? inner : disc).add(mesh);
      spinners.push({ node: mesh, rate: 0.25 / Math.max(0.15, (from + to) / 2) ** 1.5 });
    }

    // A faint gauzy halo of gas beyond the dust.
    const veil = new THREE.Mesh(new THREE.RingGeometry(outer * 0.98, outer * mix(1.22, 1.05, age), 72), hazePaint(cold.clone().lerp(main, 0.5), 0.22, THREE.DoubleSide));
    veil.rotation.x = -Math.PI / 2;
    veil.position.y = lift(1);
    disc.add(veil);

    const sunColour = new THREE.Color('#5f9bff').lerp(new THREE.Color('#ff8a1f'), mix(0.25, 1, mood.warmth));
    const sun = star(0.24, sunColour, 3, 1.2, a.pose === 'upright' ? 4 : 0);
    disc.add(sun);
    if (a.jet) {
      const beam = new THREE.MeshBasicMaterial({ color: hot.clone().lerp(new THREE.Color('#9fe8ff'), 0.5) });
      for (const sign of [1, -1]) {
        const jet = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.05, 1.7, 8), beam);
        jet.position.y = sign * 0.95;
        jet.rotation.x = sign > 0 ? 0 : Math.PI;
        const knot = glow(0.2, beam.color, 1.2, 3);
        knot.position.y = sign * 1.75;
        disc.add(jet, knot);
      }
    }

    const orbiters: { node: THREE.Object3D; rate: number }[] = [];
    const rock = new THREE.MeshStandardMaterial({ color: a.dust === 'ice' ? '#d8b98a' : '#9cc4e8', roughness: 0.7, emissive: '#2b3e52', emissiveIntensity: 0.4 });
    const pale = hot.clone().lerp(main, 0.35);
    const planet = (lane: { at: number; half: number }, size: number) => {
      const orbit = new THREE.Group();
      const r = lane.at * outer, y = lift(lane.at) + 0.03;
      const ball = new THREE.Mesh(new THREE.SphereGeometry(size, 20, 14), rock);
      ball.castShadow = true;
      ball.position.set(r, y + size * 0.6, 0);
      const hoop = new THREE.Mesh(new THREE.TorusGeometry(size * 1.9, size * 0.16, 6, 28), new THREE.MeshBasicMaterial({ color: pale }));
      hoop.rotation.x = Math.PI / 2 - 0.25;
      hoop.position.copy(ball.position);
      // The wake: a bright arc leading inward and a trailing arc outward along the lane edges.
      for (const [radius, start] of [[r - lane.half * outer * 0.8, 0.06], [r + lane.half * outer * 0.8, -0.86]] as const) {
        const wake = new THREE.Mesh(new THREE.TorusGeometry(radius, 0.035, 6, 40, 0.8), new THREE.MeshBasicMaterial({ color: pale }));
        wake.rotation.x = -Math.PI / 2;
        wake.rotation.z = start;
        wake.position.y = y + 0.05;
        orbit.add(wake);
      }
      orbit.add(ball, hoop);
      orbit.rotation.y = random() * Math.PI * 2;
      (lane.at <= split ? inner : disc).add(orbit);
      orbiters.push({ node: orbit, rate: 0.25 / lane.at ** 1.5 });
    };
    const sweepable = lanes.filter((lane) => lane.at !== split);
    if (a.newcomer === 'infant' || a.newcomer === 'pair') {
      const widest = [...sweepable].sort((x, y) => y.half - x.half);
      planet(widest[0], 0.15);
      if (a.newcomer === 'pair') planet(widest[1] ?? { at: 0.9, half: 0.03 }, 0.1);
    }
    if (a.newcomer === 'clump') {
      const f = mix(0.6, 0.85, random());
      const orbit = new THREE.Group();
      const arc = new THREE.Mesh(new THREE.TorusGeometry(f * outer, 0.16, 8, 40, 1.3), new THREE.MeshBasicMaterial({ color: pale }));
      arc.scale.z = 0.5;
      arc.rotation.x = -Math.PI / 2;
      arc.position.y = lift(f) + thickness(f);
      const bloom = glow(0.75, pale, 0.9, 4);
      bloom.position.set(Math.cos(0.65) * f * outer, lift(f) + 0.1, -Math.sin(0.65) * f * outer);
      orbit.add(arc, bloom);
      orbit.rotation.y = random() * Math.PI * 2;
      disc.add(orbit);
      orbiters.push({ node: orbit, rate: 0.25 / f ** 1.5 });
    }
    if (a.newcomer === 'spiral') {
      const orbit = new THREE.Group();
      const paint = new THREE.MeshBasicMaterial({ color: pale });
      for (const turn of [0, Math.PI]) {
        const points: THREE.Vector3[] = [];
        for (let i = 0; i <= 40; i++) {
          const f = mix(0.2, 1.02, i / 40), angle = turn + Math.log(f / 0.2) * 2.6;
          points.push(vec(Math.cos(angle) * f * outer, lift(f) + thickness(f) + 0.035, Math.sin(angle) * f * outer));
        }
        const arm = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 120, 0.075, 6), paint);
        arm.scale.y = 0.999;
        orbit.add(arm);
      }
      disc.add(orbit);
      orbiters.push({ node: orbit, rate: 0.12 });
    }

    // Late on, the dust has clumped into loose rubble that rides in the lanes and past the rim.
    const rubble = Math.round(Math.max(0, age - 0.45) * 160 * mix(0.6, 1.4, mood.density));
    if (rubble > 0) {
      const stones = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 0), new THREE.MeshStandardMaterial({ color: cold.clone().lerp(main, 0.4), roughness: 0.9, flatShading: true }), rubble);
      const matrix = new THREE.Matrix4();
      for (let i = 0; i < rubble; i++) {
        const lane = sweepable[i % Math.max(1, sweepable.length)];
        const f = i % 3 === 0 || !lane ? mix(1.02, 1.2, random()) : lane.at + (random() - 0.5) * lane.half * 1.6;
        const angle = random() * Math.PI * 2, size = mix(0.02, 0.06, random() ** 2);
        matrix.makeScale(size, size, size).setPosition(Math.cos(angle) * f * outer, lift(Math.min(f, 1)) + 0.04 + random() * 0.05, Math.sin(angle) * f * outer);
        stones.setMatrixAt(i, matrix);
      }
      stones.castShadow = true;
      disc.add(stones);
      orbiters.push({ node: stones, rate: 0.18 });
    }

    disc.rotation.x = { flat: 0.06, tilted: 0.7, upright: Math.PI / 2 - 0.12 }[a.pose] + (random() - 0.5) * 0.08;
    disc.rotation.z = (random() - 0.5) * (a.pose === 'flat' ? 0.06 : 0.3);

    const pace = mix(0.15, 1.6, mood.energy);
    return s.finish({
      footprint: a.pose === 'upright' ? 1.6 : 3.1,
      update: (dt, time) => {
        for (const spin of spinners) spin.node.rotation.y += dt * spin.rate * pace;
        for (const orbit of orbiters) orbit.node.rotation.y += dt * orbit.rate * pace;
        sun.scale.setScalar(1 + 0.04 * Math.sin(time * pace * 2));
      },
    });
  },
});
