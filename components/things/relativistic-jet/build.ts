import * as THREE from 'three';
import { Sculpture, choice, clamp01, defineThing, mix } from '@conjure/kit';

/** A tube whose radius and colour change along its length. */
function taperedTube(curve: THREE.Curve<THREE.Vector3>, steps: number, sides: number, radius: (t: number) => number, paint: (t: number, out: THREE.Color) => void) {
  const frames = curve.computeFrenetFrames(steps, false);
  const positions: number[] = [], normals: number[] = [], colours: number[] = [], index: number[] = [];
  const point = new THREE.Vector3(), normal = new THREE.Vector3(), colour = new THREE.Color();
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    curve.getPointAt(t, point);
    const r = radius(t);
    paint(t, colour);
    for (let j = 0; j <= sides; j++) {
      const angle = (j / sides) * Math.PI * 2;
      normal.copy(frames.normals[i]).multiplyScalar(Math.cos(angle)).addScaledVector(frames.binormals[i], Math.sin(angle));
      positions.push(point.x + normal.x * r, point.y + normal.y * r, point.z + normal.z * r);
      normals.push(normal.x, normal.y, normal.z);
      colours.push(colour.r, colour.g, colour.b);
    }
  }
  for (let i = 0; i < steps; i++)
    for (let j = 0; j < sides; j++) {
      const a = i * (sides + 1) + j, b = a + sides + 1;
      index.push(a, b, a + 1, b, b + 1, a + 1);
    }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colours, 3));
  geometry.setIndex(index);
  return geometry;
}

const smooth = (from: number, to: number, x: number) => { const t = clamp01((x - from) / (to - from)); return t * t * (3 - 2 * t); };

export default defineThing({
  questions: {
    path: choice('What line does the jet take?', {
      straight: 'Dead straight, ruled with a straightedge. Unwavering.',
      bent: 'Swept into one long gentle curve, as if leaning into a wind.',
      kinked: 'Straight, then snapped sideways at one or two sharp dog-legs.',
      corkscrew: 'A helix that winds wider as it travels, like a drill bit.',
    }),
    knots: choice('How many bright knots are strung along it?', {
      none: 'None: one clean unbroken beam.',
      few: 'Two or three isolated bright beads.',
      string: 'Five or six, evenly spaced like runway lights.',
      crowded: 'A dozen, jostling like pearls on a thread.',
    }),
    end: choice('How does the far end finish?', {
      lobe: 'It bursts into a huge billowing cauliflower cloud, a radio lobe.',
      hotspot: 'It slams into something: a blinding hot spot behind a curved bow shock.',
      plume: 'It widens steadily into a soft trumpet of smoke.',
      fading: 'It simply thins and gutters out into a few last sparks.',
    }),
    count: choice('Is it one jet or a pair?', {
      single: 'One jet, a single lance rising from its source.',
      twin: 'A matched pair fired in opposite directions.',
      lopsided: 'One strong jet and a feeble stub of a counter-jet behind it.',
    }),
    source: choice('What is it fired from?', {
      core: 'A bare, piercing point of light with diffraction spikes.',
      disc: 'A tiny black dot wearing a glowing ring, edge-on to the jet.',
      galaxy: 'A fuzzy golden ball of stars, the host galaxy, dwarfed by what it launches.',
    }),
    state: choice('What is the jet doing right now?', {
      steady: 'Burning steadily, as it has for a million years.',
      sputtering: 'Stuttering: the beam is broken into dashes with dark gaps between.',
      fresh: 'Newly switched on: short, bright, still punching its way out.',
      relic: 'Switched off at the source. The beam has detached and drifts on, and the far end has not heard yet.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const blue = new THREE.Color('#2f72ff').offsetHSL(mix(0.06, -0.03, mood.cheer), 0, 0);
    const pale = new THREE.Color('#dff0ff');
    const cloud = new THREE.Color().setHSL(mix(0.9, 1.1, mood.warmth) % 1, 0.9, 0.62);
    const cloudDeep = cloud.clone().offsetHSL(-0.04, 0, -0.2);
    const white = new THREE.MeshBasicMaterial({ color: '#ffffff' });
    const up = new THREE.Vector3(0, 1, 0);

    type Runner = { curve: THREE.Curve<THREE.Vector3>; beads: { mesh: THREE.Object3D; t: number; size: number }[]; from: number; to: number };
    const runners: Runner[] = [];

    const jet = (strength: number, wanted: typeof a.end) => {
      const group = new THREE.Group();
      const reach = (a.count === 'twin' ? 5.4 : 8) * (a.state === 'fresh' ? 0.45 : 1) * strength * mix(0.9, 1.1, random());
      const end = strength < 0.6 ? 'fading' : wanted;
      const side = random() < 0.5 ? -1 : 1;
      const points: THREE.Vector3[] = [];
      let tension = 0.5;
      if (a.path === 'straight') points.push(new THREE.Vector3(), new THREE.Vector3(0, reach * 0.5, 0), new THREE.Vector3(0, reach, 0));
      else if (a.path === 'bent') {
        const bend = side * mix(0.16, 0.3, random());
        for (let i = 0; i <= 6; i++) { const t = i / 6; points.push(new THREE.Vector3(bend * reach * t * t, reach * t * (1 - 0.08 * t), bend * reach * 0.2 * t * t)); }
      } else if (a.path === 'kinked') {
        tension = 0.06;
        const first = mix(0.32, 0.48, random()), second = mix(0.66, 0.8, random());
        const jog = side * reach * mix(0.1, 0.16, random());
        const two = random() < 0.6;
        const corners = [new THREE.Vector3(), new THREE.Vector3(0, reach * first, 0), new THREE.Vector3(jog, reach * second, jog * 0.3), new THREE.Vector3(two ? jog * 0.25 : jog * 1.9, reach, two ? 0 : jog * 0.5)];
        corners.forEach((corner, i) => { points.push(corner); if (i < corners.length - 1) points.push(corner.clone().lerp(corners[i + 1], 0.5)); });
      } else {
        const turns = mix(2.2, 3.4, random()), swing = mix(0.35, 0.55, random());
        for (let i = 0; i <= 44; i++) { const t = i / 44, angle = t * turns * Math.PI * 2; points.push(new THREE.Vector3(Math.cos(angle) * swing * t * side, reach * t, Math.sin(angle) * swing * t)); }
      }
      const curve = new THREE.CatmullRomCurve3(points, false, 'catmullrom', tension);
      const tip = curve.getPointAt(1), heading = curve.getTangentAt(1);

      // Where the beam exists: a relic has left its source behind, a sputtering one is dashed.
      const from = a.state === 'relic' ? mix(0.16, 0.26, random()) : 0;
      const dashes = 5 + Math.floor(random() * 4), phase = random();
      const present = (t: number) => {
        let on = smooth(from, from + 0.05, t);
        if (a.state === 'sputtering') on *= smooth(0.3, 0.5, Math.abs(((t * dashes + phase) % 1) - 0.5) * 2 + 0.12);
        if (end === 'fading') on *= 1 - smooth(0.55, 1, t);
        return on;
      };
      const thick = 0.12 * mix(0.75, 1.15, strength);
      const width = (t: number) => thick * (0.6 + 0.8 * t) * present(t) * (end === 'plume' ? 1 + 9 * smooth(0.55, 1, t) ** 1.6 : 1);
      const steps = a.path === 'corkscrew' ? 220 : 120;
      const beam = new THREE.Mesh(
        taperedTube(curve, steps, 10, width, (t, out) => {
          out.copy(pale).lerp(blue, smooth(0, 0.07, t));
          if (end === 'plume') out.lerp(cloud, smooth(0.6, 0.95, t));
          if (end === 'fading') out.lerp(pale, smooth(0.7, 1, t) * 0.6);
        }),
        new THREE.MeshStandardMaterial({ vertexColors: true, emissive: blue, emissiveIntensity: mix(0.5, 0.9, mood.energy), roughness: 0.6 }));
      beam.castShadow = true;
      group.add(beam);
      // A faint wider sheath, the slower gas dragged along.
      group.add(new THREE.Mesh(
        taperedTube(curve, steps, 8, (t) => width(t) * 2.6 + 0.02 * present(t), (_t, out) => out.copy(blue).lerp(pale, 0.55)),
        new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.2, depthWrite: false })));

      // Knots: shock diamonds that ride outward along the beam.
      const wantedKnots = { none: 0, few: 2 + Math.floor(random() * 2), string: 5 + Math.floor(random() * 2), crowded: 11 + Math.floor(random() * 3) }[a.knots];
      const total = Math.max(0, Math.round(wantedKnots * (a.state === 'fresh' ? 0.6 : 1) * (strength < 0.6 ? 0.4 : 1)));
      const runner: Runner = { curve, beads: [], from: from + 0.04, to: end === 'fading' ? 0.8 : 0.96 };
      const halo = new THREE.MeshBasicMaterial({ color: new THREE.Color('#63c8ff'), transparent: true, opacity: 0.55, depthWrite: false });
      for (let i = 0; i < total; i++) {
        const bead = new THREE.Group();
        const size = mix(0.8, 1.35, random());
        const core = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 8), white);
        core.scale.set(0.13, 0.27, 0.13);
        const shell = new THREE.Mesh(new THREE.OctahedronGeometry(1, 1), halo);
        shell.scale.set(0.21, 0.44, 0.21);
        bead.add(shell, core);
        core.position.z = 0; core.renderOrder = 1;
        // The white heart sits proud of its shell on every side.
        core.scale.multiplyScalar(1.02);
        shell.scale.multiplyScalar(0.98);
        group.add(bead);
        const even = (i + 0.5) / total;
        runner.beads.push({ mesh: bead, t: a.knots === 'few' ? mix(0.15, 0.9, random()) : clamp01(even + (random() - 0.5) * (a.knots === 'crowded' ? 0.05 : 0.02)), size });
      }
      runners.push(runner);

      // The far end.
      if (end === 'lobe' || end === 'plume') {
        const big = end === 'lobe';
        const puffs = big ? 44 + Math.floor(random() * 12 + mood.density * 24) : 12 + Math.floor(random() * 6);
        const span = (big ? mix(1.5, 2.1, random()) : 1.0) * (a.state === 'fresh' ? 0.6 : 1) * (a.count === 'twin' ? 0.85 : 1);
        const cross = new THREE.Vector3(1, 0, 0).cross(heading).normalize(), other = heading.clone().cross(cross);
        const matrix = new THREE.Matrix4(), tint = new THREE.Color();
        const billow = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 2), new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: cloudDeep, emissiveIntensity: 0.4, roughness: 1 }), puffs);
        for (let i = 0; i < puffs; i++) {
          // A mushroom: narrow where the jet enters, swelling toward the head, with a skirt falling back.
          const along = big ? mix(-0.55, 1.0, random()) : mix(-0.2, 0.8, random());
          const girth = big ? mix(0.35, 1, Math.sin(clamp01((along + 0.55) / 1.55) * Math.PI) ** 0.6) : 0.55;
          const angle = random() * Math.PI * 2, out = Math.sqrt(random()) * girth * span * 0.8;
          const at = tip.clone().addScaledVector(heading, along * span).addScaledVector(cross, Math.cos(angle) * out).addScaledVector(other, Math.sin(angle) * out);
          const size = span * mix(0.15, 0.46, random() ** 1.5) * (big ? 1 : 0.7);
          matrix.makeScale(size, size * mix(0.8, 1.1, random()), size).setPosition(at);
          billow.setMatrixAt(i, matrix);
          billow.setColorAt(i, tint.copy(cloud).lerp(cloudDeep, random() * 0.7).lerp(pale, along > 0.5 ? random() * 0.35 : 0));
        }
        billow.castShadow = billow.receiveShadow = true;
        group.add(billow);
        if (big && random() < 0.6) {
          const spot = new THREE.Mesh(new THREE.SphereGeometry(span * 0.2, 12, 8), white);
          spot.position.copy(tip).addScaledVector(heading, span * 1.15);
          group.add(spot);
        }
      } else if (end === 'hotspot') {
        const size = mix(0.26, 0.36, random()) * (a.state === 'fresh' ? 1.25 : 1);
        const spot = new THREE.Mesh(new THREE.SphereGeometry(size, 16, 10), white);
        spot.position.copy(tip);
        group.add(spot);
        const spikes = 7 + Math.floor(random() * 3);
        for (let i = 0; i < spikes; i++) {
          const dir = new THREE.Vector3(random() - 0.5, random() - 0.5, random() - 0.5).normalize();
          const length = size * mix(1.6, 3.2, random());
          const spike = new THREE.Mesh(new THREE.ConeGeometry(size * 0.16, length, 5), white);
          spike.quaternion.setFromUnitVectors(up, dir);
          spike.position.copy(tip).addScaledVector(dir, length / 2 + size * 0.5);
          group.add(spike);
        }
        // The bow shock: a cap of shoved-aside gas ahead of the impact, with a swept-back skirt.
        const shock = new THREE.Mesh(
          new THREE.SphereGeometry(size * 3.4, 28, 12, 0, Math.PI * 2, 0, 1.25),
          new THREE.MeshStandardMaterial({ color: cloud, emissive: cloudDeep, emissiveIntensity: 0.45, roughness: 0.9, side: THREE.DoubleSide }));
        shock.quaternion.setFromUnitVectors(up, heading);
        shock.position.copy(tip).addScaledVector(heading, -size * 1.7);
        shock.scale.set(1, 1.15, 1);
        shock.castShadow = true;
        group.add(shock);
      } else {
        const sparks = 8 + Math.floor(random() * 8);
        const matrix = new THREE.Matrix4();
        const dust = new THREE.InstancedMesh(new THREE.OctahedronGeometry(1, 0), new THREE.MeshBasicMaterial({ color: blue.clone().lerp(pale, 0.35) }), sparks);
        for (let i = 0; i < sparks; i++) {
          const t = mix(0.78, 1.12, random());
          const at = t <= 1 ? curve.getPointAt(t) : tip.clone().addScaledVector(heading, (t - 1) * reach);
          at.add(new THREE.Vector3(random() - 0.5, 0, random() - 0.5).multiplyScalar(0.35));
          const size = mix(0.07, 0.025, clamp01((t - 0.78) / 0.34)) * mix(0.7, 1.4, random());
          matrix.makeScale(size, size * 1.8, size).setPosition(at);
          dust.setMatrixAt(i, matrix);
        }
        group.add(dust);
      }
      return group;
    };

    const main = jet(1, a.end);
    s.root.add(main);
    if (a.count !== 'single') {
      const back = jet(a.count === 'twin' ? 1 : 0.32, a.end);
      back.rotation.z = Math.PI;
      back.rotation.y = random() * 0.4;
      s.root.add(back);
    }

    // The engine at the base.
    const live = a.state !== 'relic';
    if (a.source === 'core') {
      const heart = live ? white : new THREE.MeshStandardMaterial({ color: '#4c5670', roughness: 0.8 });
      const ball = new THREE.Mesh(new THREE.SphereGeometry(live ? 0.26 : 0.2, 18, 12), heart);
      ball.castShadow = true;
      s.root.add(ball);
      if (live) for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2 + 0.2, length = i % 2 ? 0.55 : 1.05;
        const dir = new THREE.Vector3(Math.cos(angle), 0, Math.sin(angle));
        const spike = new THREE.Mesh(new THREE.ConeGeometry(0.05, length, 5), new THREE.MeshBasicMaterial({ color: pale }));
        spike.quaternion.setFromUnitVectors(up, dir);
        spike.position.copy(dir).multiplyScalar(length / 2 + 0.15);
        s.root.add(spike);
      }
    } else if (a.source === 'disc') {
      const hole = new THREE.Mesh(new THREE.SphereGeometry(0.3, 20, 12), new THREE.MeshBasicMaterial({ color: '#0b0910' }));
      hole.castShadow = true;
      s.root.add(hole);
      const rings = live ? ['#fff3c4', '#ffc24a', '#f0762a', '#b53a1c'] : ['#6b5a52', '#54463f', '#3f3531'];
      rings.forEach((hex, i) => {
        const ring = new THREE.Mesh(new THREE.TorusGeometry(0.44 + i * 0.15, 0.07, 6, 48), new THREE.MeshBasicMaterial({ color: hex }));
        ring.rotation.x = Math.PI / 2;
        ring.scale.z = 0.35;
        s.root.add(ring);
      });
    } else {
      const gold = new THREE.Color('#e9b24a');
      const halo = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 16), new THREE.MeshBasicMaterial({ color: gold, transparent: true, opacity: 0.2, depthWrite: false }));
      halo.scale.set(1.45, 0.95, 1.45);
      s.root.add(halo);
      const nucleus = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 12), new THREE.MeshStandardMaterial({ color: live ? '#fff0c2' : '#b9a27a', emissive: gold, emissiveIntensity: live ? 0.7 : 0.15, roughness: 0.9 }));
      nucleus.scale.set(0.5, 0.36, 0.5);
      nucleus.castShadow = true;
      s.root.add(nucleus);
      const stars = 260 + Math.floor(mood.density * 240);
      s.scatter(new THREE.OctahedronGeometry(1, 0), new THREE.MeshBasicMaterial({ color: '#ffffff' }), Array.from({ length: stars }, () => {
        const angle = random() * Math.PI * 2, v = random() * 2 - 1, r = random() ** 1.7 * 1.5 + 0.2, flat = Math.sqrt(1 - v * v);
        return { at: [flat * Math.cos(angle) * r, v * r * 0.62, flat * Math.sin(angle) * r] as [number, number, number], size: 0.018 + random() * 0.028, color: gold.clone().offsetHSL((random() - 0.5) * 0.05, 0, (random() - 0.6) * 0.3) };
      })).castShadow = false;
    }

    // Lean the whole thing so it is thrown, not planted.
    const lean = (random() < 0.5 ? -1 : 1) * (a.count === 'twin' ? mix(0.75, 1.0, random()) : mix(0.2, 0.42, random()));
    for (const child of [...s.root.children]) child.applyMatrix4(new THREE.Matrix4().makeRotationZ(lean));

    const tangent = new THREE.Vector3();
    const settle = (shift: number) => {
      for (const runner of runners)
        for (const bead of runner.beads) {
          bead.t += shift;
          if (bead.t > runner.to) bead.t = runner.from + (bead.t - runner.to);
          const t = clamp01(bead.t);
          bead.mesh.position.copy(runner.curve.getPointAt(t));
          bead.mesh.quaternion.setFromUnitVectors(up, runner.curve.getTangentAt(t, tangent));
          // Swell out of the base, shrink into the end.
          const life = Math.min(smooth(runner.from, runner.from + 0.1, t), 1 - smooth(runner.to - 0.08, runner.to, t) * 0.8);
          bead.mesh.scale.setScalar(Math.max(0.001, bead.size * mix(0.7, 1.25, t) * life));
        }
    };
    settle(0);
    const pace = mix(0.008, 0.07, mood.energy) * (a.state === 'fresh' ? 1.6 : a.state === 'relic' ? 0.4 : 1);
    return s.finish({ update: (dt) => settle(dt * pace) });
  },
});
