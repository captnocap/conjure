import * as THREE from 'three';
import { Sculpture, choice, clamp01, defineThing, mix, score } from '@conjure/kit';
import { blob, hazePaint, hull, limb, makeNoise, rimPaint, softBall, softPaint, tint, vec } from './cosmos';

const STARS = {
  blue: 'A hot blue-white giant, young and furious.',
  white: 'A plain white star, anonymous.',
  gold: 'A warm golden sun-like star.',
  red: 'A swollen red giant, old and shedding itself as it goes.',
} as const;
const STAR: Record<keyof typeof STARS, [string, number]> = { blue: ['#4f8dff', 0.42], white: ['#c9d6ee', 0.36], gold: ['#ffb62e', 0.38], red: ['#ff4a2a', 0.56] };
const SHOCKS = {
  amber: 'Amber-orange, like a headlamp in fog.',
  rose: 'Rose-red, a blush or a wound.',
  teal: 'Teal-green, cold and electric.',
  violet: 'Violet, bruised and theatrical.',
} as const;
const SHOCK: Record<keyof typeof SHOCKS, string> = { amber: '#ff9a2e', rose: '#ff5a7d', teal: '#22cdb5', violet: '#a66bff' };

export default defineThing({
  questions: {
    star: choice('What kind of star is running?', STARS),
    speed: score('How fast does it seem to be moving?', ['Drifting: a blunt wide arc held far ahead', 'Hurrying', 'Hypervelocity: a narrow swept-back cone and a long streak']),
    crescent: choice('What shape is the shock ahead of it?', {
      clean: 'One clean smooth arc, like a drawn bow.',
      ragged: 'A ragged arc with a torn, fingered trailing edge.',
      double: 'Two arcs, one inside the other.',
      broken: 'A broken arc with pieces missing, starting to fail.',
    }),
    glow: choice('What colour does the shocked gas glow?', SHOCKS),
    heading: choice('Where is it headed?', {
      level: 'Dead level, across the frame.',
      climbing: 'Climbing, up and away.',
      diving: 'Diving, headlong and down.',
    }),
    medium: choice('What is it ploughing through?', {
      empty: 'Thin clear gas, nothing in its way.',
      clumpy: 'Dark clumps of dust that it shoulders aside.',
      filaments: 'Long strands of gas that drape over the shock like wet hair.',
    }),
    left: choice('What did it leave behind or drag along?', {
      nothing: 'Nothing: it travels alone.',
      planet: 'One small planet still trailing loyally in its wake.',
      debris: 'Shreds of its torn-off disc, arcs and crumbs strung out behind.',
      twin: 'A fainter twin far behind on the same line, the thread between them stretched thin.',
      birthplace: 'A lump of the dark cloud it was born in, with a hole where it left.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const noise = makeNoise(context.seed);
    const white = new THREE.Color('#ffffff');
    const speed = a.speed;
    const [starHex, starSize] = STAR[a.star];
    const starColour = new THREE.Color(starHex);
    const shock = new THREE.Color(SHOCK[a.glow]).lerp(new THREE.Color(mood.warmth > 0.5 ? '#ffa040' : '#60a8ff'), Math.abs(mood.warmth - 0.5) * 0.25);
    const wobble = (amount: number) => (random() - 0.5) * amount;
    // Everything is built travelling along +y, then the whole craft is turned to its heading.
    const craft = new THREE.Group();
    s.root.add(craft);
    const width = mix(2.3, 1.15, speed), depth = mix(2, 4.6, speed), standoff = mix(1.55, 0.8, speed), tail = mix(2.6, 6.2, speed);
    const rough = clamp01((a.crescent === 'ragged' ? 0.75 : a.crescent === 'broken' ? 0.4 : 0.1) + mood.wear * 0.25);

    const surface = (u: number, phi: number, grow: number, target: THREE.Vector3) => {
      const bumps = 1 + rough * 0.22 * u * noise(Math.cos(phi) * 2.4, Math.sin(phi) * 2.4, u * 3, 3);
      const r = width * grow * Math.sqrt(u) * bumps;
      return target.set(Math.cos(phi) * r, standoff * grow - depth * grow * u, Math.sin(phi) * r);
    };
    const bow = (grow: number, strength: number, reachTo = 1, fill = 0.17, outline = true) => {
      const around = 72, along = 28;
      const positions: number[] = [], indices: number[] = [];
      const point = new THREE.Vector3();
      for (let i = 0; i <= around; i++) {
        const phi = (i / around) * Math.PI * 2;
        const lip = reachTo * (1 - rough * 0.5 * (0.5 + 0.5 * noise(Math.cos(phi) * 3.5 + 11, Math.sin(phi) * 3.5, grow * 7, 3)));
        for (let j = 0; j <= along; j++) {
          surface((j / along) ** 1.6 * lip, phi, grow, point);
          positions.push(point.x, point.y, point.z);
        }
      }
      for (let i = 0; i < around; i++)
        for (let j = 0; j < along; j++) {
          if (a.crescent === 'broken' && noise(Math.cos((i / around) * 6.28) * 1.6 + grow * 3, Math.sin((i / around) * 6.28) * 1.6, (j / along) * 2.2, 2) > 0.16 && j > 3) continue;
          const p0 = i * (along + 1) + j, p1 = p0 + along + 1;
          indices.push(p0, p1, p0 + 1, p1, p1 + 1, p0 + 1);
        }
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      geometry.setIndex(indices);
      geometry.computeVertexNormals();
      const veil = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ color: shock, transparent: true, opacity: Math.max(0.21, fill * strength), side: THREE.DoubleSide }));
      const edge = new THREE.Mesh(geometry, softPaint(shock.clone().lerp(white, 0.1), 0.95 * strength, 1.6, true, THREE.DoubleSide));
      edge.renderOrder = 3;
      craft.add(veil);
      if (outline) craft.add(edge);
      else { edge.geometry = geometry; (edge.material as THREE.Material).dispose(); }
    };
    bow(1, 1);
    // The nose of the shock is the hottest part.
    bow(0.985, 1, 0.42, 0.26, false);
    bow(0.97, 1, 0.16, 0.4, false);
    if (a.crescent === 'double') bow(1.32, 0.7, 0.8);
    const nose = softBall(width * 0.5, shock.clone().lerp(white, 0.25), 0.7, 2.5);
    nose.position.y = standoff - 0.1;
    nose.scale.y = 0.45;
    craft.add(nose);

    // The runaway itself.
    const runner = new THREE.Group();
    const body = new THREE.Mesh(new THREE.SphereGeometry(starSize, 36, 24), new THREE.MeshBasicMaterial({ color: starColour.clone().lerp(white, 0.3) }));
    runner.add(body, softBall(starSize * 1.3, starColour, 0.85, 1.4), softBall(starSize * 2.6, starColour, 0.4, 2.4));
    const spikePaint = new THREE.MeshBasicMaterial({ color: starColour.clone().lerp(white, 0.15) });
    for (const [x, y] of [[0.25, 1.15], [1.6, 0.2]] as const) {
      const spike = new THREE.Mesh(new THREE.OctahedronGeometry(1, 0), spikePaint);
      spike.scale.set(starSize * Math.max(x, 0.09), starSize * Math.max(y, 0.09) * 1.6, starSize * 0.09);
      runner.add(spike);
    }
    craft.add(runner);

    // Wake: a tapering trail and streaks that flow back past the star.
    const trailPoints = [0, 0.25, 0.5, 0.75, 1].map((t) => vec(wobble(0.25) * t, -starSize * 0.5 - tail * t, wobble(0.25) * t));
    craft.add(new THREE.Mesh(limb(trailPoints, { rings: 30, sides: 10, radius: (t) => starSize * (0.95 * (1 - t) ** 1.3 + 0.03) }), hazePaint(starColour, 0.34)));
    craft.add(new THREE.Mesh(limb(trailPoints, { rings: 30, sides: 8, radius: (t) => starSize * (0.3 * (1 - t) ** 1.1 + 0.015) }), new THREE.MeshBasicMaterial({ color: starColour.clone().lerp(white, 0.25) })));
    const streakCount = Math.round(mix(18, 70, speed) * mix(0.7, 1.3, mood.density));
    const streaks = new THREE.InstancedMesh(new THREE.BoxGeometry(0.016, 1, 0.016), hazePaint(shock, 0.75), streakCount);
    const flights = Array.from({ length: streakCount }, () => ({ phi: random() * Math.PI * 2, r: Math.sqrt(random()), u: random(), length: mix(0.3, 1.1, random()) * mix(0.6, 1.8, speed) }));
    craft.add(streaks);
    const matrix = new THREE.Matrix4(), scale = new THREE.Vector3(), origin = new THREE.Vector3(), still = new THREE.Quaternion();
    const settle = () => {
      for (const [i, flight] of flights.entries()) {
        const y = mix(standoff * 0.6, -tail, flight.u);
        const spread = width * 0.9 * Math.sqrt(clamp01((standoff - y) / depth)) * flight.r;
        scale.set(1, flight.length * Math.sin(Math.PI * flight.u) + 0.02, 1);
        matrix.compose(origin.set(Math.cos(flight.phi) * spread, y, Math.sin(flight.phi) * spread), still, scale);
        streaks.setMatrixAt(i, matrix);
      }
      streaks.instanceMatrix.needsUpdate = true;
    };
    settle();

    const dustLow = new THREE.Color('#0d0c1c').lerp(new THREE.Color('#1c0d08'), mood.warmth);
    const dustHigh = new THREE.Color('#2b2d52').lerp(new THREE.Color('#54301c'), mood.warmth);
    const dust = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95 });
    const shade = new THREE.Color();
    const lump = (radius: number, at: THREE.Vector3, stretch = 1, detail = 8) => {
      const geometry = blob(radius, (d) => (1 + 0.3 * noise(d.x * 2 + at.x * 3, d.y * 2 + at.y, d.z * 2, 3)) * (d.y < 0 ? 1 + (stretch - 1) * d.y * d.y : 1), detail);
      tint(geometry, (p) => shade.copy(dustLow).lerp(dustHigh, clamp01(0.5 + 0.5 * noise(p.x * 1.5, p.y * 1.5, p.z * 1.5, 3))));
      const node = new THREE.Group();
      const mesh = new THREE.Mesh(geometry, dust);
      mesh.castShadow = true;
      node.add(mesh, new THREE.Mesh(hull(geometry, (_p, n) => radius * (0.04 + 0.12 * Math.max(0, -n.y))), rimPaint(shock)));
      node.position.copy(at);
      craft.add(node);
      return node;
    };
    const drifters: { node: THREE.Object3D; phase: number }[] = [];
    if (a.medium === 'clumpy') {
      const count = 5 + Math.floor(random() * 3 + mood.density * 4);
      const point = new THREE.Vector3();
      for (let i = 0; i < count; i++) {
        // Clumps sit just outside the shock surface, their tails combed back along it.
        surface(mix(0.02, 0.9, random() ** 1.5), random() * Math.PI * 2, mix(1.12, 1.4, random()), point);
        drifters.push({ node: lump(mix(0.14, 0.34, random()), point.clone(), mix(1.5, 2.6, speed)), phase: random() * 6.28 });
      }
    }
    if (a.medium === 'filaments') {
      const count = 9 + Math.floor(random() * 4 + mood.density * 5);
      const paint = new THREE.MeshBasicMaterial({ color: shock.clone().lerp(white, 0.3) });
      const point = new THREE.Vector3();
      for (let i = 0; i < count; i++) {
        const phi = (i / count) * Math.PI * 2 + wobble(0.3), drift = wobble(0.5);
        const points: THREE.Vector3[] = [];
        for (let j = 0; j <= 12; j++) {
          const u = mix(0.01, 1.08, (j / 12) ** 1.4);
          points.push(surface(u, phi + drift * u * 0.5 + 0.05 * Math.sin(u * 5 + i), 1.03, point).clone());
        }
        craft.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 40, mix(0.012, 0.03, random()), 5), paint));
      }
    }

    const behind = -tail * 0.82;
    if (a.left === 'planet') {
      const world = new THREE.Mesh(new THREE.SphereGeometry(0.17, 20, 14), new THREE.MeshStandardMaterial({ color: a.star === 'blue' ? '#c9a070' : '#7fa8c9', roughness: 0.75 }));
      world.castShadow = true;
      world.position.set(0.45, behind, 0.3);
      const comet = new THREE.Mesh(limb([world.position.clone(), world.position.clone().add(vec(0.05, -0.9, 0))], { rings: 8, sides: 8, radius: (t) => 0.13 * (1 - t) + 0.01 }), hazePaint('#c8d8e8', 0.4));
      craft.add(world, comet);
      drifters.push({ node: world, phase: 1 });
    } else if (a.left === 'debris') {
      const scrap = new THREE.MeshStandardMaterial({ color: dustHigh.clone().lerp(starColour, 0.25), roughness: 0.9 });
      for (let i = 0; i < 7; i++) {
        const arc = new THREE.Mesh(new THREE.TorusGeometry(mix(0.35, 0.95, random()), 0.035, 6, 24, mix(0.5, 1.6, random())), scrap);
        arc.scale.z = 0.35;
        arc.position.set(wobble(1.1), mix(-0.9, -tail, (i + random()) / 7), wobble(1.1));
        arc.rotation.set(random() * 6.28, random() * 6.28, random() * 6.28);
        arc.castShadow = true;
        craft.add(arc);
        drifters.push({ node: arc, phase: random() * 6.28 });
      }
      for (let i = 0; i < 10; i++) lump(mix(0.04, 0.1, random()), vec(wobble(1.4), mix(-0.6, -tail, random()), wobble(1.4)), 1, 3);
    } else if (a.left === 'twin') {
      const at = vec(wobble(0.5), -tail * 1.08, wobble(0.4));
      const tone = a.star === 'blue' || a.star === 'white' ? new THREE.Color('#ffb24a') : new THREE.Color('#7fb0ff');
      const twin = new THREE.Group();
      twin.add(new THREE.Mesh(new THREE.SphereGeometry(starSize * 0.55, 24, 16), new THREE.MeshBasicMaterial({ color: tone.clone().lerp(white, 0.3) })), softBall(starSize * 1.5, tone, 0.45, 2.2));
      twin.position.copy(at);
      const thread = limb([vec(0, -starSize, 0), at.clone().multiplyScalar(0.35).add(vec(0.3, 0, 0.1)), at.clone().multiplyScalar(0.7).add(vec(-0.25, 0, -0.1)), at], { rings: 40, sides: 5, radius: (t) => 0.012 + 0.02 * (2 * t - 1) ** 2 });
      craft.add(twin, new THREE.Mesh(thread, new THREE.MeshBasicMaterial({ color: tone.clone().lerp(starColour, 0.5) })));
    } else if (a.left === 'birthplace') {
      const home = lump(1.15, vec(wobble(0.3), -tail * 1.12 - 0.5, wobble(0.3)), 1, 14);
      home.scale.set(1.25, 0.8, 1.15);
      const door = softBall(0.42, shock.clone().lerp(white, 0.2), 0.9, 1.5);
      door.position.set(0, 0.78, 0);
      door.scale.y = 0.5;
      home.add(door);
    }

    const side = random() < 0.5 ? -1 : 1;
    const heading = { level: vec(side, 0.06, 0.28), climbing: vec(side * 0.8, 0.62, 0.25), diving: vec(side * 0.82, -0.52, 0.3) }[a.heading].normalize();
    craft.quaternion.setFromUnitVectors(vec(0, 1, 0), heading);

    const pace = mix(0.3, 1.5, mood.energy) * mix(0.5, 1.6, speed);
    return s.finish({
      update: (dt, time) => {
        for (const flight of flights) flight.u = (flight.u + dt * pace * 0.35) % 1;
        settle();
        for (const drift of drifters) drift.node.rotation.y = drift.phase + time * pace * 0.3;
        runner.scale.setScalar(1 + 0.03 * Math.sin(time * 5 * pace));
      },
    });
  },
});
