import * as THREE from 'three';
import { choice, defineThing, disposeTree, mix, noul, score } from '@conjure/kit';

interface Orbit {
  a: number;
  e: number;
  turn: THREE.Quaternion;
  phase: number;
  rate: number;
  size: number;
  star: THREE.Group;
}

/** Where a body is on its ellipse (focus at the origin) for a mean anomaly, by Newton's method. */
function kepler(orbit: Orbit, mean: number, out: THREE.Vector3) {
  let E = mean;
  for (let i = 0; i < 6; i++) E -= (E - orbit.e * Math.sin(E) - mean) / (1 - orbit.e * Math.cos(E));
  return out.set(orbit.a * (Math.cos(E) - orbit.e), 0, orbit.a * Math.sqrt(1 - orbit.e * orbit.e) * Math.sin(E)).applyQuaternion(orbit.turn);
}

export default defineThing({
  questions: {
    stars: choice('How many stars are in the swarm?', {
      three: 'Three: a tense little triangle of rivals.',
      five: 'Five, a handful.',
      eight: 'Eight, a busy court.',
      thirteen: 'Thirteen, a crowd that keeps nearly colliding.',
    }),
    tracks: choice('Are the orbits drawn?', {
      lines: 'Yes, as fine complete ellipses, like an astronomer\'s plot.',
      dotted: 'As dotted lines, a diagram in a textbook.',
      trails: 'Only as a fading streak of beads behind each star, showing where it has just been.',
      none: 'No: just the stars, and you have to infer the pull.',
    }),
    closest: score('How tight is the closest pass to the centre?', ['A wide, wary berth on near-circles', 'Leaning in', 'Close shaves on long ellipses', 'Grazing: needle-thin orbits that almost touch the centre']),
    pace: score('How fast does it feel?', ['Stately, a clockwork orrery', 'Brisk', 'Whipping round, stars smeared into streaks at the turn']),
    planes: choice('How are the orbits arranged?', {
      tangle: 'Every orbit in its own plane, a tangle like the classic atom symbol.',
      plate: 'Mostly in one tilted plane, like a spinning plate.',
      crossed: 'Two families crossing each other at a steep angle, like scissors.',
    }),
    centre: choice('What marks the invisible point they circle?', {
      nothing: 'Nothing at all. The emptiness is the point.',
      crosshair: 'A small surveyor\'s crosshair, as if someone is still looking for it.',
      dot: 'A tiny, perfectly black dot.',
      ember: 'A faint smouldering orange ring, barely awake.',
    }),
    mount: choice('How is it presented?', {
      free: 'Floating free in space.',
      orrery: 'On a turned brass stand, a desk orrery with the tracks as wire hoops.',
      armillary: 'Inside a cage of brass meridian rings on a heavy foot, an armillary instrument.',
    }),
    plunge: noul('Is one star at its closest pass right now, brightest and fastest?'),
  },

  build(a, context) {
    const { mood, random } = context;
    const root = new THREE.Group();
    const swarm = new THREE.Group();
    root.add(swarm);
    const count = { three: 3, five: 5, eight: 8, thirteen: 13 }[a.stars];
    const brass = a.mount !== 'free';
    const metal = new THREE.MeshStandardMaterial({ color: '#b98a3a', metalness: 0.75, roughness: mix(0.3, 0.6, mood.wear) });
    const ink = new THREE.MeshBasicMaterial({ color: brass ? '#8c6a2c' : '#54699c' });
    const blue = new THREE.Color('#2f6dff'), hot = new THREE.Color('#cfe4ff'), ruddy = new THREE.Color('#ff7a3c');

    // Two reference planes for the crossed families; the plate uses the first.
    const tilted = (x: number, z: number, y: number) => new THREE.Quaternion().setFromEuler(new THREE.Euler(x, y, z));
    const families = [tilted(0.5, 0.35, random() * 6), tilted(-0.75, -0.9, random() * 6)];
    const orbits: Orbit[] = [];
    const reach = 3.1;
    for (let i = 0; i < count; i++) {
      const e = Math.min(0.965, mix(mix(0.08, 0.8, a.closest), mix(0.35, 0.96, a.closest), random()));
      // Apocentre is what we see; keep every orbit inside the same reach.
      const apo = reach * mix(0.42, 1, (i + random()) / count);
      const semi = apo / (1 + e);
      let turn: THREE.Quaternion;
      if (a.planes === 'tangle') turn = tilted(random() * Math.PI, random() * Math.PI, random() * Math.PI * 2);
      else {
        const family = a.planes === 'plate' ? families[0] : families[i % 2];
        turn = family.clone().multiply(tilted((random() - 0.5) * 0.28, (random() - 0.5) * 0.28, random() * Math.PI * 2));
      }
      const size = mix(0.14, 0.25, random());
      const star = new THREE.Group();
      const tint = random() < mix(0, 0.3, mood.warmth) - 0.12 ? ruddy : blue.clone().offsetHSL((random() - 0.5) * 0.05, 0, (random() - 0.5) * 0.1);
      const body = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 10), new THREE.MeshBasicMaterial({ color: tint }));
      body.castShadow = true;
      const heart = new THREE.Mesh(new THREE.SphereGeometry(0.55, 10, 8), new THREE.MeshBasicMaterial({ color: hot }));
      heart.position.set(0, 0.25, 0.62);
      const glint = new THREE.MeshBasicMaterial({ color: tint.clone().lerp(hot, 0.45) });
      const rays = new THREE.Group();
      for (let r = 0; r < 4; r++) {
        const ray = new THREE.Mesh(new THREE.OctahedronGeometry(1, 0), glint);
        const long = r < 2 ? 2.6 : 1.7;
        ray.scale.set(0.16, long, 0.16);
        ray.rotation.z = (r % 2) * Math.PI / 2 + (r < 2 ? 0 : Math.PI / 4);
        rays.add(ray);
      }
      star.add(body, heart, rays);
      star.scale.setScalar(size);
      swarm.add(star);
      orbits.push({ a: semi, e, turn, phase: random() * Math.PI * 2, rate: (reach / 2 / semi) ** 1.5, size, star });
    }
    if (a.plunge) orbits[0].phase = 0.04;

    // The drawn tracks.
    const point = new THREE.Vector3();
    const sample = (orbit: Orbit, t: number) => {
      // Even steps in eccentric anomaly keep the tight end of the ellipse smooth.
      const E = t * Math.PI * 2;
      return new THREE.Vector3(orbit.a * (Math.cos(E) - orbit.e), 0, orbit.a * Math.sqrt(1 - orbit.e * orbit.e) * Math.sin(E)).applyQuaternion(orbit.turn);
    };
    const wire = brass ? 0.028 : 0.017;
    if (a.tracks === 'lines' || (brass && a.tracks !== 'dotted')) {
      for (const orbit of orbits) {
        const curve = new THREE.CatmullRomCurve3(Array.from({ length: 72 }, (_unused, i) => sample(orbit, i / 72)), true);
        const hoop = new THREE.Mesh(new THREE.TubeGeometry(curve, 144, wire, 6, true), brass ? metal : ink);
        hoop.castShadow = true;
        swarm.add(hoop);
      }
    } else if (a.tracks === 'dotted') {
      const dots: THREE.Vector3[] = [];
      for (const orbit of orbits) {
        const n = Math.round(30 + orbit.a * 22);
        for (let i = 0; i < n; i++) dots.push(sample(orbit, i / n));
      }
      const mesh = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 6, 4), ink, dots.length);
      const matrix = new THREE.Matrix4();
      dots.forEach((dot, i) => mesh.setMatrixAt(i, matrix.makeScale(wire * 1.5, wire * 1.5, wire * 1.5).setPosition(dot)));
      mesh.castShadow = true;
      swarm.add(mesh);
    }
    const beads = 14;
    const trail = a.tracks === 'trails' ? new THREE.InstancedMesh(new THREE.SphereGeometry(1, 8, 6), new THREE.MeshBasicMaterial({ color: '#ffffff' }), count * beads) : null;
    if (trail) {
      const shade = new THREE.Color();
      for (let i = 0; i < count * beads; i++) trail.setColorAt(i, shade.copy(blue).lerp(hot, 0.15 + 0.6 * ((i % beads) / beads)));
      trail.frustumCulled = false;
      swarm.add(trail);
    }

    // The centre.
    if (a.centre === 'dot') swarm.add(new THREE.Mesh(new THREE.SphereGeometry(0.11, 16, 10), new THREE.MeshBasicMaterial({ color: '#0b0910' })));
    else if (a.centre === 'crosshair') {
      const hair = new THREE.MeshBasicMaterial({ color: '#c8371d' });
      for (const axis of [new THREE.Euler(0, 0, 0), new THREE.Euler(0, 0, Math.PI / 2), new THREE.Euler(Math.PI / 2, 0, 0)]) {
        const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.62, 6), hair);
        rod.rotation.copy(axis);
        swarm.add(rod);
      }
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.012, 6, 32), hair);
      ring.rotation.x = -0.5;
      swarm.add(ring);
    } else if (a.centre === 'ember') {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.045, 8, 32), new THREE.MeshBasicMaterial({ color: '#f08a2a' }));
      ring.rotation.x = -0.55;
      const pit = new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 8), new THREE.MeshBasicMaterial({ color: '#0b0910' }));
      swarm.add(ring, pit);
    }

    // How far the swarm reaches, to stand it on the ground.
    let low = 0, wide = 0;
    for (const orbit of orbits)
      for (let i = 0; i < 48; i++) { const p = sample(orbit, i / 48); low = Math.min(low, p.y); wide = Math.max(wide, p.length()); }
    // With nothing drawn but the stars, stand the swarm on where they are now rather than where they could go.
    if (!brass && (a.tracks === 'none' || a.tracks === 'trails')) {
      low = 0;
      for (const orbit of orbits) low = Math.min(low, kepler(orbit, orbit.phase, point).y);
    }
    let lift = -low + 0.2;
    if (brass) {
      lift = -low + 0.75;
      const foot = new THREE.Mesh(new THREE.LatheGeometry([[0, 0], [0.85, 0], [0.88, 0.06], [0.78, 0.12], [0.42, 0.17], [0.2, 0.26], [0.11, 0.42], [0.075, 0.6], [0.11, 0.68], [0.06, 0.76], [0.045, lift]].map(([x, y]) => new THREE.Vector2(x, y)), 40), metal);
      foot.castShadow = foot.receiveShadow = true;
      root.add(foot);
      const hub = new THREE.Mesh(new THREE.SphereGeometry(0.07, 12, 8), metal);
      hub.position.y = lift;
      root.add(hub);
      if (a.mount === 'armillary') {
        const cage = new THREE.Group();
        const R = wide + 0.22;
        const rings: [number, number, number][] = [[0, 0, 0], [0, Math.PI / 2, 0], [Math.PI / 2, 0, 0], [Math.PI / 2 - 0.41, 0, 0]];
        rings.forEach((turn, i) => {
          const hoop = new THREE.Mesh(new THREE.TorusGeometry(R, i < 2 ? 0.045 : 0.03, 8, 96), metal);
          hoop.rotation.set(...turn);
          if (i === 3) hoop.scale.setScalar(0.97);
          hoop.castShadow = true;
          cage.add(hoop);
        });
        cage.position.y = lift = R + 0.6;
        root.add(cage);
        foot.scale.y = (lift - R + 0.03) / (-low + 0.75);
        hub.position.y = lift;
        const axle = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, R * 2, 6), metal);
        axle.position.y = lift;
        root.add(axle);
      }
    }
    swarm.position.y = lift;

    const speed = mix(0.12, 0.9, a.pace) * mix(0.35, 1.5, mood.energy);
    const smear = mix(0, 1.6, a.pace);
    const next = new THREE.Vector3(), flight = new THREE.Vector3(), forward = new THREE.Vector3(0, 1, 0), matrix = new THREE.Matrix4();
    let clock = 0;
    const settle = (dt: number) => {
      clock += dt * speed;
      orbits.forEach((orbit, index) => {
        const mean = orbit.phase + clock * orbit.rate;
        kepler(orbit, mean, point);
        kepler(orbit, mean + 0.01, next);
        flight.copy(next).sub(point);
        const swift = flight.length() / 0.01 / orbit.a;
        orbit.star.position.copy(point);
        // Near the turn a star brightens and stretches along its flight.
        const rays = orbit.star.children[2];
        orbit.star.quaternion.setFromUnitVectors(forward, flight.normalize());
        orbit.star.scale.set(orbit.size, orbit.size * (1 + Math.min(2.2, Math.max(0, swift - 1.2) * 0.35 * smear)), orbit.size);
        rays.scale.setScalar(Math.min(1.9, 0.8 + swift * 0.22));
        if (trail)
          for (let k = 0; k < beads; k++) {
            kepler(orbit, mean - (k + 1) * mix(0.05, 0.11, a.pace), next);
            const girth = orbit.size * 0.62 * (1 - k / beads);
            trail.setMatrixAt(index * beads + (beads - 1 - k), matrix.makeScale(girth, girth, girth).setPosition(next));
          }
      });
      if (trail) trail.instanceMatrix.needsUpdate = true;
    };
    settle(0);

    return { object: root, footprint: brass ? Math.max(1.1, wide * 0.8) : wide, update: settle, dispose: () => disposeTree(root) };
  },
});
