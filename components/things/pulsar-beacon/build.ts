import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul, score } from '@conjure/kit';

const BEAMS = {
  ice: 'Cold blue-white, clinical and exact.',
  violet: 'Radio violet, strange and electric.',
  gold: 'Hot gold, like a real lighthouse lamp.',
  green: 'Signal green, an instrument trace.',
  red: 'Warning red, an alarm that never clears.',
} as const;
const BEAM_TINT: Record<keyof typeof BEAMS, [string, string]> = {
  ice: ['#2f8fe0', '#bfe6ff'], violet: ['#7a3fd6', '#d9c2ff'], gold: ['#e89a14', '#ffe9a8'], green: ['#16a86a', '#b8ffd9'], red: ['#d8322c', '#ffc4b4'],
};

type P = [number, number, number];

export default defineThing({
  questions: {
    spin: choice('How does its rotation feel?', {
      stately: 'A slow, grand sweep, one turn every few seconds.',
      frantic: 'A millisecond blur, spinning so fast the beams smear into a disc.',
      stuttering: 'Ticking round in jerks with pauses, like a second hand.',
      dying: 'Barely turning, nearly spun down, each sweep an effort.',
    }),
    beam: choice('What colour are the beams?', BEAMS),
    width: score('How wide are the beams?', ['Pencil-thin needles', 'Narrow cones', 'Broad lighthouse fans']),
    field: choice('What shape are the magnetic field lines?', {
      dipole: 'Neat nested loops from pole to pole, like a textbook bar magnet.',
      pinched: 'Tight little loops hugging the poles, with long open lines streaming away.',
      wound: 'Loops dragged round into a spiral by the spin, like a wound spring.',
      lopsided: 'An off-centre field, loops bulging far out on one side only.',
    }),
    glitch: noul('Is it glitching right now, its beat skipping and its beams breaking up?'),
    signal: choice('What trace does its signal leave?', {
      none: 'Nothing: just the beams.',
      ticks: 'Evenly spaced rings threaded along each beam, like tick marks.',
      wake: 'A flat spiral wake of pulses spreading round its equator.',
    }),
    company: choice('What keeps it company?', {
      alone: 'Nothing at all.',
      torus: 'A glowing doughnut of wind nebula round its waist, like the Crab pulsar.',
      widow: 'A small companion star it is slowly stripping away to a comet-shaped husk.',
      debris: 'A thin tilted ring of rubble from whatever it used to be part of.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const [deep, pale] = BEAM_TINT[a.beam];
    const R = 0.42;
    const glow = mix(0.7, 1.5, mood.cheer);
    const warm = new THREE.Color().setHSL(mix(0.6, 0.08, mood.warmth), 0.55, 0.62);

    // Everything tied to the star leans a little so it never reads as a plain upright axis.
    const body = new THREE.Group();
    body.rotation.z = mix(0.12, 0.3, random()) * (random() < 0.5 ? -1 : 1);
    body.rotation.x = mix(-0.15, 0.15, random());
    s.root.add(body);
    const spinner = new THREE.Group();
    body.add(spinner);
    const magnet = new THREE.Group();
    const tilt = mix(0.6, 1.05, random());
    magnet.rotation.z = tilt;
    spinner.add(magnet);
    const add = <T extends THREE.Object3D>(parent: THREE.Object3D, child: T) => { parent.add(child); return child; };
    const solid = (geometry: THREE.BufferGeometry, material: THREE.Material) => {
      const mesh = new THREE.Mesh(geometry, material);
      mesh.castShadow = true;
      return mesh;
    };

    // The star: a dense little ball with a darker limb, banded hot spots and two blazing polar caps.
    const starPaint = new THREE.MeshStandardMaterial({ color: warm.clone().lerp(new THREE.Color(pale), 0.5), emissive: new THREE.Color(pale).lerp(warm, 0.3), emissiveIntensity: 0.55 * glow, roughness: 0.35 });
    add(spinner, solid(new THREE.SphereGeometry(R, 40, 24), starPaint));
    const capPaint = new THREE.MeshStandardMaterial({ color: deep, emissive: deep, emissiveIntensity: 1.2 * glow, roughness: 0.3 });
    const bandPaint = new THREE.MeshStandardMaterial({ color: new THREE.Color(deep).multiplyScalar(0.55), roughness: 0.6 });
    for (const side of [-1, 1]) {
      const cap = add(magnet, solid(new THREE.SphereGeometry(R * 1.012, 24, 8, 0, Math.PI * 2, 0, 0.42), capPaint));
      if (side < 0) cap.rotation.x = Math.PI;
      const collar = add(magnet, solid(new THREE.TorusGeometry(R * 0.44, R * 0.035, 6, 32), bandPaint));
      collar.rotation.x = Math.PI / 2;
      collar.position.y = side * R * 0.9;
    }
    // Spin bands make the rotation legible.
    for (let i = 0; i < 3; i++) {
      const lat = (i - 1) * 0.5 + (random() - 0.5) * 0.2;
      const band = add(spinner, solid(new THREE.TorusGeometry(Math.cos(lat) * R * 1.005, R * 0.022, 6, 48, Math.PI * mix(0.5, 1.6, random())), bandPaint));
      band.rotation.x = Math.PI / 2;
      band.rotation.z = random() * 6;
      band.position.y = Math.sin(lat) * R;
    }
    // A soft corona, drawn darker than the paper so it survives a pale backdrop.
    const halo = (radius: number, opacity: number) =>
      add(spinner, new THREE.Mesh(new THREE.SphereGeometry(radius, 24, 14), new THREE.MeshBasicMaterial({ color: deep, transparent: true, opacity, depthWrite: false })));
    halo(R * 1.4, 0.22);
    halo(R * 1.95, 0.1);
    // Diffraction spikes: the drawn shorthand for something too bright to look at.
    const spikePaint = new THREE.MeshStandardMaterial({ color: pale, emissive: deep, emissiveIntensity: 0.9 * glow, roughness: 0.4 });
    const spikes = 4 + (random() < 0.5 ? 0 : 2);
    for (let i = 0; i < spikes; i++) {
      const spike = add(body, solid(new THREE.OctahedronGeometry(1, 0), spikePaint));
      const reach = R * (i % 2 ? 2.1 : 2.9) * mix(0.8, 1.15, mood.cheer);
      spike.scale.set(reach, R * 0.07, R * 0.07);
      spike.rotation.y = (i / spikes) * Math.PI + 0.4;
    }

    // Beams: a solid bright core inside translucent cones, optionally broken up by a glitch.
    const length = mix(2.5, 3.1, random());
    const spread = mix(0.035, 0.26, a.width);
    const beamCore = new THREE.MeshStandardMaterial({ color: pale, emissive: deep, emissiveIntensity: 1.1 * glow, roughness: 0.4 });
    const coneOuter = new THREE.MeshBasicMaterial({ color: deep, transparent: true, opacity: 0.3, depthWrite: false, side: THREE.DoubleSide });
    const coneInner = new THREE.MeshBasicMaterial({ color: new THREE.Color(deep).lerp(new THREE.Color(pale), 0.45), transparent: true, opacity: 0.42, depthWrite: false, side: THREE.DoubleSide });
    const tickPaint = new THREE.MeshStandardMaterial({ color: deep, emissive: deep, emissiveIntensity: 0.7 * glow, roughness: 0.5 });
    const frustum = (from: number, to: number, slope: number, material: THREE.Material, side: number, offset: P = [0, 0, 0]) => {
      const mesh = new THREE.Mesh(new THREE.CylinderGeometry(Math.max(0.004, to * slope), Math.max(0.004, from * slope), to - from, 28, 1, true), material);
      mesh.position.set(offset[0], side * (from + to) / 2 + offset[1], offset[2]);
      if (side < 0) mesh.rotation.x = Math.PI;
      magnet.add(mesh);
      return mesh;
    };
    for (const side of [-1, 1]) {
      const pieces: [number, number][] = [];
      if (a.glitch) {
        let at = R;
        while (at < length) {
          const run = mix(0.22, 0.6, random());
          pieces.push([at, Math.min(length, at + run)]);
          at += run + mix(0.1, 0.3, random());
        }
      } else pieces.push([R, length]);
      for (const [from, to] of pieces) {
        const off: P = a.glitch && from > R ? [(random() - 0.5) * 0.16, 0, (random() - 0.5) * 0.16] : [0, 0, 0];
        frustum(from, to, spread, coneOuter, side, off);
        frustum(from, to, spread * 0.55, coneInner, side, off);
        const core = frustum(from, to, Math.max(0.022, spread * 0.2), beamCore, side, off);
        core.castShadow = true;
      }
      if (a.signal === 'ticks') {
        const ticks = 5 + Math.floor(mood.density * 4);
        for (let i = 1; i <= ticks; i++) {
          const d = R + (length - R) * (i / (ticks + 0.5));
          const ring = add(magnet, solid(new THREE.TorusGeometry(d * spread + 0.07, 0.016, 6, 32), tickPaint));
          ring.rotation.x = Math.PI / 2;
          ring.position.y = side * d;
        }
      }
    }

    // Magnetic field lines: r = L sin^2(theta) around the magnetic axis.
    const linePaint = new THREE.MeshStandardMaterial({ color: new THREE.Color(deep).lerp(new THREE.Color('#1c2440'), 0.45), emissive: deep, emissiveIntensity: 0.25 * glow, roughness: 0.55 });
    const openPaint = linePaint.clone();
    openPaint.color.lerp(new THREE.Color(pale), 0.35);
    const shells = a.field === 'pinched' ? [0.62, 0.85] : a.field === 'lopsided' ? [0.9, 1.3, 1.75] : [0.85, 1.25, 1.65];
    const around = 4 + Math.round(mood.density * 4);
    const loops: THREE.BufferGeometry[] = [];
    const line = (points: P[], radius: number, paint: THREE.Material) => {
      const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)));
      const geometry = new THREE.TubeGeometry(curve, 48, radius, 5, false);
      loops.push(geometry);
      add(magnet, solid(geometry, paint));
    };
    shells.forEach((L, shell) => {
      const count = around + (shell % 2);
      for (let k = 0; k < count; k++) {
        if (random() < mood.wear * 0.3) continue; // a worn field has gaps
        const phi = (k / count) * Math.PI * 2 + shell * 0.4 + (random() - 0.5) * 0.15;
        const reach = a.field === 'lopsided' ? L * mix(0.45, 1.25, (Math.cos(phi) + 1) / 2) : L;
        const start = Math.asin(Math.sqrt(Math.min(1, (R * 0.98) / reach)));
        const points: P[] = [];
        for (let i = 0; i <= 26; i++) {
          const theta = mix(start, Math.PI - start, i / 26);
          const r = reach * Math.sin(theta) ** 2;
          const twist = a.field === 'wound' ? (i / 26 - 0.5) * 2.6 * (r / reach) + (r / reach) * 1.1 : 0;
          points.push([r * Math.sin(theta) * Math.cos(phi + twist), r * Math.cos(theta), r * Math.sin(theta) * Math.sin(phi + twist)]);
        }
        line(points, mix(0.02, 0.013, shell / 3), linePaint);
      }
    });
    if (a.field === 'pinched')
      for (const side of [-1, 1])
        for (let k = 0; k < 6; k++) {
          const phi = (k / 6) * Math.PI * 2 + random() * 0.3;
          const points: P[] = [];
          for (let i = 0; i <= 10; i++) {
            const t = i / 10;
            const out = R * 0.5 + t * t * 1.25, up = R * 0.86 + t * 1.9;
            points.push([out * Math.cos(phi + t * 0.5), side * up, out * Math.sin(phi + t * 0.5)]);
          }
          line(points, 0.014, openPaint);
        }

    if (a.signal === 'wake') {
      // An Archimedean spiral of pulses in the spin equator.
      const turns = 2.2;
      const points: P[] = [];
      for (let i = 0; i <= 90; i++) {
        const t = i / 90, angle = t * turns * Math.PI * 2, r = R * 1.4 + t * 2.0;
        points.push([Math.cos(angle) * r, Math.sin(angle * 3) * 0.02, Math.sin(angle) * r]);
      }
      const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)));
      add(body, solid(new THREE.TubeGeometry(curve, 180, 0.02, 5, false), tickPaint));
      const beads = Array.from({ length: 16 }, (_unused, i) => {
        const p = points[5 + i * 5];
        return { at: p, size: mix(0.05, 0.028, i / 16) };
      });
      const dots = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 10, 8), beamCore, beads.length);
      const matrix = new THREE.Matrix4();
      beads.forEach((bead, index) => dots.setMatrixAt(index, matrix.makeScale(bead.size, bead.size, bead.size).setPosition(...bead.at)));
      dots.castShadow = true;
      body.add(dots);
    }

    // Company.
    let orbiter: THREE.Object3D | null = null;
    if (a.company === 'torus') {
      const cloud = new THREE.MeshStandardMaterial({ color: new THREE.Color(deep).lerp(warm, 0.5), emissive: deep, emissiveIntensity: 0.3 * glow, roughness: 0.8, transparent: true, opacity: 0.85 });
      for (let i = 0; i < 3; i++) {
        const ring = add(body, solid(new THREE.TorusGeometry(1.05 + i * 0.32, mix(0.07, 0.03, i / 2), 8, 72), i === 0 ? cloud : tickPaint));
        ring.rotation.x = Math.PI / 2;
        ring.scale.z = 1;
      }
      orbiter = body.children.at(-1)!;
    } else if (a.company === 'debris') {
      const ring = new THREE.Group();
      ring.rotation.set(0.35 * (random() - 0.5), 0, mix(0.2, 0.5, random()));
      const count = 70 + Math.round(mood.density * 110);
      const rocks = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(1, 0), new THREE.MeshStandardMaterial({ color: '#5a5560', roughness: 0.9, flatShading: true }), count);
      const matrix = new THREE.Matrix4(), turn = new THREE.Quaternion(), scale = new THREE.Vector3(), at = new THREE.Vector3();
      for (let i = 0; i < count; i++) {
        const angle = random() * Math.PI * 2, r = mix(1.9, 2.35, random());
        at.set(Math.cos(angle) * r, (random() - 0.5) * 0.07, Math.sin(angle) * r);
        turn.setFromEuler(new THREE.Euler(random() * 6, random() * 6, random() * 6));
        scale.setScalar(mix(0.018, 0.07, random() ** 2));
        rocks.setMatrixAt(i, matrix.compose(at, turn, scale));
      }
      rocks.castShadow = true;
      ring.add(rocks);
      body.add(ring);
      orbiter = ring;
    } else if (a.company === 'widow') {
      const pivot = new THREE.Group();
      pivot.rotation.y = random() * 6;
      const husk = new THREE.Group();
      husk.position.set(2.05, 0, 0);
      const rock = new THREE.MeshStandardMaterial({ color: '#8c4a36', emissive: '#c2441c', emissiveIntensity: 0.35 * glow, roughness: 0.8 });
      const lit = new THREE.MeshStandardMaterial({ color: pale, emissive: deep, emissiveIntensity: 0.9 * glow, roughness: 0.4 });
      husk.add(solid(new THREE.SphereGeometry(0.3, 24, 16), rock));
      // The face turned to the pulsar is scorched bright; its far side trails off as a comet tail.
      const face = solid(new THREE.SphereGeometry(0.305, 24, 12, 0, Math.PI * 2, 0, 0.9), lit);
      face.rotation.z = Math.PI / 2;
      husk.add(face);
      const tail = new THREE.Mesh(new THREE.ConeGeometry(0.28, 1.5, 20, 1, true), new THREE.MeshBasicMaterial({ color: '#c2441c', transparent: true, opacity: 0.35, depthWrite: false, side: THREE.DoubleSide }));
      tail.rotation.z = -Math.PI / 2;
      tail.position.x = 0.8;
      husk.add(tail);
      for (let i = 0; i < 9; i++) {
        const bit = solid(new THREE.DodecahedronGeometry(mix(0.05, 0.015, i / 9), 0), rock);
        bit.position.set(0.4 + i * 0.13, (random() - 0.5) * 0.2, (random() - 0.5) * 0.2);
        husk.add(bit);
      }
      pivot.add(husk);
      body.add(pivot);
      orbiter = pivot;
    }

    if (a.glitch) {
      // A starquake has thrown a little crown of crust flakes off the surface.
      const count = 26;
      const flakes = new THREE.InstancedMesh(new THREE.TetrahedronGeometry(1, 0), bandPaint, count);
      const matrix = new THREE.Matrix4(), turn = new THREE.Quaternion(), scale = new THREE.Vector3(), at = new THREE.Vector3();
      for (let i = 0; i < count; i++) {
        at.setFromSphericalCoords(R * mix(1.25, 2.0, random()), mix(0.9, 2.2, random()), random() * 6.3);
        turn.setFromEuler(new THREE.Euler(random() * 6, random() * 6, 0));
        scale.setScalar(mix(0.02, 0.055, random()));
        flakes.setMatrixAt(i, matrix.compose(at, turn, scale));
      }
      flakes.castShadow = true;
      spinner.add(flakes);
    }

    const rate = { stately: 0.9, frantic: 9, stuttering: 1.6, dying: 0.22 }[a.spin] * mix(0.6, 1.5, mood.energy);
    if (a.spin === 'frantic') {
      // Too fast to follow: the swept beams smear into a pair of shallow cones.
      const smear = new THREE.MeshBasicMaterial({ color: deep, transparent: true, opacity: 0.1, depthWrite: false, side: THREE.DoubleSide });
      for (const side of [-1, 1]) {
        const cone = new THREE.Mesh(new THREE.ConeGeometry(Math.sin(tilt) * length, Math.cos(tilt) * length, 48, 1, true), smear);
        cone.position.y = side * Math.cos(tilt) * length / 2;
        if (side > 0) cone.rotation.x = Math.PI;
        body.add(cone);
      }
    }
    spinner.rotation.y = random() * Math.PI * 2;
    let clock = random() * 10;
    return s.finish({
      footprint: 1.3,
      update(dt, time) {
        clock += dt;
        let step = dt * rate;
        if (a.spin === 'stuttering') step *= (clock * 1.3) % 1 < 0.45 ? 2.2 : 0;
        if (a.glitch && Math.sin(clock * 2.7) + Math.sin(clock * 7.1) > 1.45) step *= -0.4;
        spinner.rotation.y += step;
        if (orbiter) orbiter.rotation.y += dt * 0.12 * mix(0.5, 1.5, mood.energy);
        capPaint.emissiveIntensity = 1.2 * glow * (0.8 + 0.2 * Math.sin(time * rate * 2));
      },
    });
  },
});
