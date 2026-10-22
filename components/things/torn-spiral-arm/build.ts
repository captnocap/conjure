import * as THREE from 'three';
import { Sculpture, choice, clamp01, defineThing, mix, score } from '@conjure/kit';

const STARS = {
  young: 'Young: cream fading to brilliant blue along the outer edge.',
  mixed: 'Mixed: gold on the inside, blue outside, pink knots between.',
  aging: 'Aging: amber and rust, the blue stars already burnt out.',
  pale: 'Pale silver-lilac, drained of colour like a pressed flower.',
} as const;
const STAR_PALETTE: Record<keyof typeof STARS, [string, string, string]> = {
  young: ['#e9d9a8', '#5c9cf0', '#2a63d8'],
  mixed: ['#eab04a', '#7fb0ea', '#2f6fe0'],
  aging: ['#e8a03c', '#d9773a', '#a8492c'],
  pale: ['#cfc8d8', '#a9a6c8', '#7d7aa8'],
};

/** A flattened tube swept along a path: `half` is its half-width, colour runs from inner edge to outer edge. */
function band(points: THREE.Vector3[], sides: THREE.Vector3[], half: (t: number) => number, thick: (t: number) => number, colour: (across: number, t: number) => THREE.Color, around = 12) {
  const positions: number[] = [], colours: number[] = [], index: number[] = [];
  const steps = points.length - 1;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps, w = half(t), h = thick(t);
    for (let j = 0; j < around; j++) {
      const angle = (j / around) * Math.PI * 2, across = Math.cos(angle);
      const p = points[i].clone().addScaledVector(sides[i], across * w);
      positions.push(p.x, p.y + Math.sin(angle) * h, p.z);
      const tint = colour(across, t);
      colours.push(tint.r, tint.g, tint.b);
    }
  }
  for (let i = 0; i < steps; i++)
    for (let j = 0; j < around; j++) {
      const a = i * around + j, b = i * around + ((j + 1) % around), c = a + around, d = b + around;
      index.push(a, b, c, b, d, c);
    }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colours, 3));
  geometry.setIndex(index);
  geometry.computeVertexNormals();
  return geometry;
}

export default defineThing({
  questions: {
    length: score('How long is the piece?', ['A short shard', 'A good length of arm', 'A long sweeping arc', 'Nearly half the spiral, torn off whole']),
    curve: choice('Has it kept its curve?', {
      curled: 'Still tightly curved, exactly as it was when attached.',
      relaxing: 'Opening out, the curve slowly relaxing.',
      straight: 'Nearly straightened into a bar: it has forgotten the spiral.',
      kinked: 'Bent at a sharp kink partway along, like a broken wing.',
    }),
    lane: choice('What is its dust lane like?', {
      dark: 'A dark brown lane along the inner edge, a shadow line.',
      lit: 'Lit from within, glowing ember orange.',
      pink: 'Dark, but studded with hot pink star-forming clouds.',
      stripped: 'Stripped away: bare stars with no dust left.',
    }),
    brokenEnd: choice('How did it break?', {
      clean: 'A clean break: the ends are neat, as if sliced.',
      ragged: 'A ragged tear, with streamers and debris trailing from the torn end.',
      crumbling: 'It is crumbling into several pieces with gaps opening between them.',
      bleeding: 'Whole, but stars leak steadily from its inner edge back toward where home was.',
    }),
    stars: choice('What colour are its stars?', STARS),
    echo: choice('Is there any sign of where it came from?', {
      none: 'None: it drifts alone with no context.',
      ghost: 'A faint dashed outline continues its curve inward, tracing the spiral that is no longer there.',
      home: 'The galaxy it left is visible nearby, small, with an obvious gap where this arm used to be.',
    }),
    pose: choice('How does it sit?', {
      tilted: 'Tipped up toward the viewer like a displayed fragment.',
      flat: 'Lying nearly flat, a crescent on a table.',
      edge: 'Almost on edge, a thin bright sliver.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const gauss = () => (random() + random() + random() - 1.5) * 0.82;
    const palette = STAR_PALETTE[a.stars].map((hex) => new THREE.Color(hex).offsetHSL((mood.warmth - 0.5) * -0.03, (mood.cheer - 0.5) * 0.2, (mood.cheer - 0.5) * 0.06));
    const glow = mix(0.2, 0.7, mood.cheer);
    const dust = a.lane === 'lit' ? new THREE.Color('#e8702a') : new THREE.Color('#3a2a2c').lerp(new THREE.Color('#5c4034'), mood.warmth * 0.5);
    const pink = new THREE.Color('#f0508f');
    const plate = new THREE.Group();
    s.root.add(plate);
    const add = <T extends THREE.Mesh>(mesh: T) => {
      mesh.castShadow = mesh.receiveShadow = true;
      plate.add(mesh);
      return mesh;
    };

    // The spine, walked out by arc length with the chosen curvature.
    const total = mix(3.4, 7.4, a.length);
    const bend = { curled: 1 / 2.3, relaxing: 1 / 4.2, straight: 1 / 14, kinked: 1 / 5 }[a.curve];
    const N = 160;
    const spine: THREE.Vector3[] = [], side: THREE.Vector3[] = [];
    let heading = -0.3 - bend * total * 0.5, x = 0, z = 0;
    const kinkAt = mix(0.4, 0.6, random());
    for (let i = 0; i <= N; i++) {
      const t = i / N;
      spine.push(new THREE.Vector3(x, 0, z));
      // The outer edge is on the convex side.
      side.push(new THREE.Vector3(Math.sin(heading), 0, Math.cos(heading)));
      heading += (bend * (1 - 0.35 * t) * total) / N + (a.curve === 'kinked' && Math.abs(t - kinkAt) < 0.03 ? 0.14 : 0);
      x += (Math.cos(heading) * total) / N;
      z -= (Math.sin(heading) * total) / N;
    }
    // Pieces: one, or several with gaps.
    const cuts = a.brokenEnd === 'crumbling' ? [0, ...Array.from({ length: 2 + Math.floor(random() * 2) }, () => mix(0.2, 0.8, random())).sort(), 1] : [0, 1];
    const pieces = cuts.slice(0, -1).map((from, i) => {
      const gap = a.brokenEnd === 'crumbling' ? mix(0.02, 0.05, random()) : 0;
      return { from: from + (i ? gap : 0), to: cuts[i + 1] - (i < cuts.length - 2 ? gap : 0), shift: a.brokenEnd === 'crumbling' ? new THREE.Vector3(gauss() * 0.18, gauss() * 0.22, gauss() * 0.18) : new THREE.Vector3() };
    }).filter((piece) => piece.to - piece.from > 0.06);
    const fullWidth = mix(0.42, 0.62, random()) * mix(0.85, 1.15, a.length);
    const ragged = a.brokenEnd === 'ragged';
    const phases = [random() * 6, random() * 6, random() * 6];
    const at = (t: number, across: number, lift = 0, shift = new THREE.Vector3()) => {
      const f = clamp01(t) * N, i = Math.min(N - 1, Math.floor(f)), k = f - i;
      return spine[i].clone().lerp(spine[i + 1], k).addScaledVector(side[i].clone().lerp(side[i + 1], k), across).add(shift).setY(lift + shift.y);
    };

    const stars: { at: [number, number, number]; size: number; color: THREE.Color }[] = [];
    const laneMaterial = new THREE.MeshStandardMaterial({ color: dust, roughness: 0.9, emissive: a.lane === 'lit' ? dust : new THREE.Color('#000000'), emissiveIntensity: a.lane === 'lit' ? glow * 1.1 : 0 });
    const bodyMaterial = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.75, emissive: palette[1], emissiveIntensity: glow * 0.25 });
    const beads: THREE.Mesh[] = [];
    for (const piece of pieces) {
      const span = piece.to - piece.from, steps = Math.max(12, Math.round(span * N));
      const points = Array.from({ length: steps + 1 }, (_unused, i) => at(mix(piece.from, piece.to, i / steps), 0, 0, piece.shift));
      const sides = Array.from({ length: steps + 1 }, (_unused, i) => side[Math.min(N, Math.round(mix(piece.from, piece.to, i / steps) * N))]);
      const ends = (t: number) => {
        const blunt = a.brokenEnd === 'clean' ? 0.04 : 0.16;
        const edge = Math.min(1, Math.min(t, 1 - t) / blunt);
        return Math.pow(edge, a.brokenEnd === 'clean' ? 0.35 : 0.8);
      };
      const half = (t: number) => {
        const global = mix(piece.from, piece.to, t);
        const swell = 1 + 0.16 * Math.sin(global * 11 + phases[0]) + 0.08 * Math.sin(global * 27 + phases[1]);
        const tear = ragged && t < 0.25 ? 1 - 0.35 * Math.abs(Math.sin(t * 60 + phases[2])) * (1 - t / 0.25) : 1;
        return fullWidth * swell * ends(t) * tear * mix(1.1, 0.8, global);
      };
      add(new THREE.Mesh(band(points, sides, half, (t) => 0.06 * ends(t) + 0.015, (across) => (across < 0 ? palette[0].clone().lerp(palette[1], clamp01(across + 1)) : palette[1].clone().lerp(palette[2], clamp01(across * 1.2)))), bodyMaterial));

      // The dust lane hugs the inner edge and stands a little proud of the stars.
      if (a.lane !== 'stripped') {
        const lanePoints = Array.from({ length: steps + 1 }, (_unused, i) => at(mix(piece.from, piece.to, i / steps), -half(i / steps) * 0.58, 0.07, piece.shift));
        add(new THREE.Mesh(band(lanePoints, sides, (t) => half(t) * mix(0.2, 0.3, 0.5 + 0.5 * Math.sin(t * 40 + phases[1])), (t) => 0.07 * ends(t) + 0.01, () => new THREE.Color('#ffffff'), 8), laneMaterial)).material.vertexColors = false;
        const feathers = Math.round(span * 16);
        for (let i = 0; i < feathers; i++) {
          const t = mix(0.08, 0.92, (i + random() * 0.6) / feathers), global = mix(piece.from, piece.to, t), w = half(t);
          const from = at(global, -w * 0.5, 0.08, piece.shift), to = at(global + 0.03, w * mix(0.1, 0.6, random()), 0.09, piece.shift);
          const spur = add(new THREE.Mesh(new THREE.CylinderGeometry(0.006, mix(0.02, 0.04, random()), 1, 5), laneMaterial));
          const reach = to.clone().sub(from);
          spur.scale.y = reach.length();
          spur.position.copy(from).addScaledVector(reach, 0.5);
          spur.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), reach.normalize());
        }
      }

      // Blue clusters ride the outer edge; pink clouds sit in the lane.
      const clusterCount = Math.round(span * total * mix(1.6, 3.4, mood.density));
      for (let i = 0; i < clusterCount; i++) {
        const t = mix(0.05, 0.95, (i + random() * 0.8) / clusterCount), global = mix(piece.from, piece.to, t), w = half(t);
        const size = mix(0.06, 0.15, random());
        const tint = a.stars === 'aging' ? palette[1].clone().offsetHSL(0, 0, 0.12) : a.stars === 'pale' ? new THREE.Color('#e4e0f0') : new THREE.Color('#6fb2ff');
        const p = at(global, w * mix(0.45, 0.95, random()), 0.1 + size * 0.5, piece.shift);
        const bead = add(new THREE.Mesh(new THREE.SphereGeometry(size, 12, 8), new THREE.MeshStandardMaterial({ color: tint, roughness: 0.4, emissive: tint, emissiveIntensity: glow })));
        bead.position.copy(p);
        beads.push(bead);
        for (let k = 0; k < 8; k++) stars.push({ at: p.clone().add(new THREE.Vector3(gauss(), gauss() * 0.5, gauss()).multiplyScalar(size * 2.2)).toArray(), size: size * mix(0.15, 0.35, random()), color: tint.clone().offsetHSL(0, 0, 0.08) });
      }
      if (a.lane === 'pink' || a.stars === 'mixed') {
        const knots = Math.round(span * total * (a.lane === 'pink' ? 2.2 : 0.9));
        for (let i = 0; i < knots; i++) {
          const t = mix(0.08, 0.92, (i + random() * 0.8) / knots), global = mix(piece.from, piece.to, t), w = half(t);
          const size = mix(0.08, 0.17, random());
          const knot = add(new THREE.Mesh(new THREE.IcosahedronGeometry(size, 1), new THREE.MeshStandardMaterial({ color: pink, roughness: 0.7, emissive: pink, emissiveIntensity: glow * 0.9, flatShading: true })));
          knot.position.copy(at(global, -w * mix(0.25, 0.65, random()), 0.12, piece.shift));
          knot.scale.y = 0.7;
        }
      }
      const fill = Math.round(span * total * mix(120, 300, mood.density));
      for (let i = 0; i < fill; i++) {
        const t = random(), global = mix(piece.from, piece.to, t), across = gauss() * 1.1;
        const tint = across < 0 ? palette[0] : across < 0.5 ? palette[1] : palette[2];
        stars.push({ at: at(global, across * half(t) * 1.15, 0.07 + Math.abs(gauss()) * 0.1, piece.shift).toArray(), size: mix(0.02, 0.06, random() * random()), color: tint.clone().offsetHSL(0, 0, (random() - 0.2) * 0.3) });
      }
    }

    // Debris from the break.
    const tornFrom = at(0, 0), away = at(0, 0).sub(at(0.05, 0)).normalize();
    if (ragged) {
      for (let i = 0; i < 5; i++) {
        const across = mix(-0.8, 0.8, (i + random() * 0.5) / 5) * fullWidth, length = mix(0.6, 1.9, random());
        const points = Array.from({ length: 6 }, (_unused, k) => at(0.02, across * (1 + k * 0.08)).addScaledVector(away, (k / 5) * length).add(new THREE.Vector3(gauss() * 0.05, gauss() * 0.04 + 0.03, gauss() * 0.05)));
        const sides = points.map(() => side[0]);
        add(new THREE.Mesh(band(points, sides, (t) => mix(0.07, 0.008, t), (t) => mix(0.05, 0.008, t), () => palette[i % 2 ? 1 : 0], 6), bodyMaterial));
      }
      for (let i = 0; i < 90; i++) {
        const p = tornFrom.clone().addScaledVector(away, Math.pow(random(), 1.5) * 2.4).add(new THREE.Vector3(gauss(), gauss() * 0.3, gauss()).multiplyScalar(0.4));
        stars.push({ at: p.toArray(), size: mix(0.02, 0.07, random() * random()), color: (i % 4 ? palette[i % 3] : dust).clone() });
      }
    }
    if (a.brokenEnd === 'bleeding') {
      for (let i = 0; i < 260; i++) {
        const t = random(), fall = Math.pow(random(), 1.4) * 2.2;
        const p = at(t, -fullWidth * 0.9 - fall, 0.05 - fall * 0.05).add(new THREE.Vector3(gauss() * 0.05, 0, gauss() * 0.05));
        stars.push({ at: p.toArray(), size: mix(0.045, 0.014, fall / 2.2), color: palette[i % 2].clone().offsetHSL(0, 0, fall * 0.05) });
      }
    }

    // Where it came from: the centre of the old spiral lies on the concave side.
    const mid = at(0.5, 0), inward = side[Math.round(N / 2)].clone().multiplyScalar(-1);
    const centre = mid.clone().addScaledVector(inward, Math.min(2.5, 1 / bend + 0.3));
    const ghostMaterial = new THREE.MeshBasicMaterial({ color: '#7f88b0', transparent: true, opacity: 0.75, depthWrite: false });
    if (a.echo === 'ghost') {
      const startRadius = at(1, 0).distanceTo(centre), startAngle = Math.atan2(at(1, 0).z - centre.z, at(1, 0).x - centre.x);
      const turn = Math.sign(new THREE.Vector3().crossVectors(at(0.98, 0).sub(centre), at(1, 0).sub(centre)).y) || 1;
      for (let i = 0; i < 26; i++) {
        if (i % 2) continue;
        const dash = (k: number) => {
          const u = (i + k) / 26, angle = startAngle - turn * u * 3.6, r = startRadius * Math.exp(-u * 1.9);
          return new THREE.Vector3(centre.x + Math.cos(angle) * r, 0.02, centre.z + Math.sin(angle) * r);
        };
        add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([dash(0), dash(0.5), dash(1)]), 6, 0.022, 5), ghostMaterial));
      }
      const hub = add(new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.02, 5, 28), ghostMaterial));
      hub.rotation.x = Math.PI / 2;
      hub.position.copy(centre).setY(0.02);
    } else if (a.echo === 'home') {
      const home = new THREE.Group();
      const gold = new THREE.Color('#edb04a');
      const bulge = new THREE.Mesh(new THREE.SphereGeometry(0.36, 20, 14), new THREE.MeshStandardMaterial({ color: gold, roughness: 0.5, emissive: gold, emissiveIntensity: glow * 0.8 }));
      bulge.scale.y = 0.6;
      home.add(bulge);
      for (let arm = 0; arm < 3; arm++) {
        if (arm === 0) continue; // the arm that is missing
        const points = Array.from({ length: 20 }, (_unused, k) => {
          const u = k / 19, angle = (arm / 3) * Math.PI * 2 + u * 3.2, r = 0.35 + u * 0.85;
          return new THREE.Vector3(Math.cos(angle) * r, 0, Math.sin(angle) * r);
        });
        const sides = points.map((p) => p.clone().normalize());
        const armMesh = new THREE.Mesh(band(points, sides, (t) => mix(0.16, 0.05, t), () => 0.04, (across) => palette[0].clone().lerp(palette[2], clamp01(across * 0.5 + 0.5)), 8), bodyMaterial);
        home.add(armMesh);
      }
      const stump = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 6), laneMaterial);
      stump.position.set(0.42, 0, 0);
      home.add(stump);
      home.traverse((node) => { if ((node as THREE.Mesh).isMesh) node.castShadow = true; });
      home.position.copy(centre);
      home.rotation.y = Math.atan2(-(mid.z - centre.z), mid.x - centre.x);
      plate.add(home);
    }

    const flock = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 0), new THREE.MeshBasicMaterial({ color: '#ffffff' }), stars.length);
    const matrix = new THREE.Matrix4();
    stars.forEach((star, i) => {
      matrix.makeScale(star.size, star.size, star.size).setPosition(...star.at);
      flock.setMatrixAt(i, matrix);
      flock.setColorAt(i, star.color);
    });
    plate.add(flock);

    plate.rotation.x = { tilted: 0.85, flat: 0.25, edge: 1.2 }[a.pose];
    plate.rotation.z = (random() - 0.5) * 0.3;
    const sizes = beads.map((bead) => bead.scale.x);
    return s.finish({
      footprint: 1.6,
      update(_dt, time) {
        beads.forEach((bead, i) => bead.scale.setScalar(sizes[i] * (1 + Math.sin(time * (1.5 + (i % 5) * 0.4) + i) * 0.1 * (0.2 + mood.energy))));
      },
    });
  },
});
