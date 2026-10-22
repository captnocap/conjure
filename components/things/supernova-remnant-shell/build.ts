import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';

type P = [number, number, number];

export default defineThing({
  questions: {
    shape: choice('What shape is the shell?', {
      round: 'A nearly perfect round bubble.',
      lopsided: 'Blown out on one side, like a bubble pushed by wind.',
      veil: 'Only a torn half remains: a curved veil of filaments with ragged edges.',
      crab: 'An egg-shaped tangle filled right through with filaments, like the Crab nebula.',
    }),
    weave: choice('What is the filament pattern like?', {
      lace: 'Fine dense lace of many short threads.',
      net: 'An open net of long looping cords with knots where they cross.',
      streamers: 'Long streamers all combed outward from the centre.',
      knots: 'Sparse, thick, clotted ropes.',
    }),
    gas: choice('Which colours dominate?', {
      tricolour: 'Red, green and blue in equal measure, like a false-colour telescope image.',
      hydrogen: 'Mostly ember red with touches of the others.',
      oxygen: 'Mostly teal and blue, cold and ghostly.',
      sulphur: 'Gold and rust with a little green.',
    }),
    age: score('How old does it look?', ['Days old: small, tight and fierce', 'Centuries: full and intricate', 'Ancient: huge, thin, faded and full of holes']),
    centre: choice('What sits at the centre?', {
      empty: 'Nothing: the star is entirely gone.',
      pulsar: 'A tiny bright pulsar with two small beams.',
      ember: 'A small pale stellar ember with a soft halo.',
      void: 'A black point ringed with light.',
      glow: 'A lingering knot of amber gas, still warm.',
    }),
    front: choice('What is happening at its edge?', {
      calm: 'Nothing: it expands evenly into empty space.',
      shock: 'One side has hit something and piled up into a bright, flattened shock arc.',
      echoes: 'Thin rings of light echo surround it, like ripples.',
      shedding: 'Loose knots and bullets of gas are racing out ahead of the shell.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const age = a.age;
    const R = mix(1.25, 2.3, age);
    const glow = mix(0.6, 1.25, mood.cheer) * mix(1.2, 0.6, age);
    const fade = (hex: string) => new THREE.Color(hex).lerp(new THREE.Color('#8f8a96'), age * 0.18 + mood.wear * 0.12);
    const palette = {
      tricolour: ['#d8342c', '#27a567', '#2f6fe0'], hydrogen: ['#d8342c', '#e2603a', '#3b7fd0'], oxygen: ['#1f9c9a', '#2f6fe0', '#c44a5a'], sulphur: ['#d99a1e', '#b5492a', '#5a9e48'],
    }[a.gas].map(fade);
    const weights = { tricolour: [1, 1, 1], hydrogen: [3, 1.2, 0.6], oxygen: [2, 2, 0.6], sulphur: [2, 1.6, 0.8] }[a.gas];
    weights[0] *= mix(0.7, 1.4, mood.warmth);
    weights[weights.length - 1] *= mix(1.4, 0.7, mood.warmth);
    const pickColour = () => {
      let roll = random() * (weights[0] + weights[1] + weights[2]);
      for (let i = 0; i < 3; i++) if ((roll -= weights[i]) < 0) return i;
      return 2;
    };

    const dir = () => { const y = random() * 2 - 1, phi = random() * Math.PI * 2, r = Math.sqrt(1 - y * y); return new THREE.Vector3(Math.cos(phi) * r, y, Math.sin(phi) * r); };
    const shell = new THREE.Group();
    shell.rotation.set(mix(-0.3, 0.3, random()), random() * 6, mix(-0.3, 0.3, random()));
    s.root.add(shell);
    const bias = new THREE.Vector3(1, mix(0.1, 0.5, random()), 0).normalize();
    const holes = Array.from({ length: Math.round(age * 5 + mood.wear * 2) }, () => ({ at: dir(), size: mix(0.25, 0.6, random()) }));
    // The radius of the shell in a given direction, or 0 where it has been torn away.
    const radiusAt = (d: THREE.Vector3): number => {
      const along = d.dot(bias);
      for (const hole of holes) if (d.angleTo(hole.at) < hole.size) return 0;
      if (a.shape === 'veil' && along < -0.15 + Math.sin(d.y * 9 + d.z * 7) * 0.18) return 0;
      let r = R;
      if (a.shape === 'lopsided') r *= 1 + 0.5 * Math.max(0, along) ** 2 - 0.12 * Math.max(0, -along);
      if (a.shape === 'crab') r *= mix(0.78, 1.25, Math.abs(d.y) ** 1.5) * 0.9;
      if (a.front === 'shock' && along < -0.55) r *= mix(1, 0.78, (-along - 0.55) / 0.45);
      return r;
    };

    const tubes: THREE.BufferGeometry[][] = [[], [], []];
    const knots: { at: P; size: number; colour: THREE.Color }[] = [];
    const style = {
      lace: { count: 150, steps: 9, turn: 1.3, radius: 0.016, ripple: 0.05 },
      net: { count: 46, steps: 34, turn: 0.45, radius: 0.026, ripple: 0.04 },
      streamers: { count: 110, steps: 14, turn: 0.35, radius: 0.022, ripple: 0.03 },
      knots: { count: 26, steps: 16, turn: 0.9, radius: 0.05, ripple: 0.09 },
    }[a.weave];
    const count = Math.round(style.count * mix(0.7, 1.25, mood.density) * (a.shape === 'veil' ? 0.75 : 1));
    const up = new THREE.Vector3();
    for (let f = 0; f < count; f++) {
      const colour = pickColour();
      const d = dir();
      const heading = dir().cross(d).normalize();
      // Crab filaments live at every depth; the others sit on the skin.
      let depth = a.shape === 'crab' ? mix(0.3, 1, Math.sqrt(random())) : mix(0.94, 1.04, random());
      const outward = a.weave === 'streamers' && f % 5 < 3;
      if (outward) depth = mix(0.5, 0.68, random());
      const points: THREE.Vector3[] = [];
      for (let i = 0; i < style.steps; i++) {
        const r = radiusAt(d);
        if (r === 0) break;
        points.push(d.clone().multiplyScalar(r * depth * (1 + Math.sin(i * 1.9 + f) * style.ripple)));
        if (outward) {
          depth += 0.055;
          if (depth > 1) break;
        }
        const axis = up.crossVectors(d, heading).normalize();
        d.applyAxisAngle(axis, outward ? 0.02 : 0.085).normalize();
        heading.applyAxisAngle(d, (random() - 0.5) * style.turn).applyAxisAngle(axis, outward ? 0.02 : 0.085).normalize();
      }
      if (points.length < 3) continue;
      const thick = style.radius * mix(0.7, 1.3, random()) * mix(1.1, 0.95, age);
      tubes[colour].push(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), points.length * 3, thick, 5, false));
      if (a.weave !== 'lace' && random() < (a.weave === 'knots' ? 1 : 0.6)) {
        const p = points[Math.floor(random() * points.length)];
        knots.push({ at: [p.x, p.y, p.z], size: thick * mix(2, 3.4, random()), colour: palette[colour] });
      }
    }
    const paints = palette.map((colour) => new THREE.MeshStandardMaterial({ color: colour, emissive: colour, emissiveIntensity: 0.22 * glow, roughness: 0.35, metalness: 0.1 }));
    tubes.forEach((group, index) => {
      if (!group.length) return;
      const merged = mergeGeometries(group)!;
      group.forEach((geometry) => geometry.dispose());
      const mesh = new THREE.Mesh(merged, paints[index]);
      mesh.castShadow = true;
      shell.add(mesh);
    });

    if (a.front === 'shedding')
      for (let i = 0; i < 26; i++) {
        const d = dir();
        const r = radiusAt(d);
        if (!r) continue;
        const p = d.multiplyScalar(r * mix(1.12, 1.5, random()));
        knots.push({ at: [p.x, p.y, p.z], size: mix(0.03, 0.08, random()), colour: palette[pickColour()] });
      }
    if (knots.length) {
      const beads = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 1), new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: '#ffffff', emissiveIntensity: 0.12 * glow, roughness: 0.3 }), knots.length);
      const matrix = new THREE.Matrix4();
      knots.forEach((knot, index) => {
        beads.setMatrixAt(index, matrix.makeScale(knot.size, knot.size, knot.size).setPosition(...knot.at));
        beads.setColorAt(index, knot.colour);
      });
      beads.castShadow = true;
      shell.add(beads);
    }

    // A thin membrane of gas between the filaments: the glass of the ornament.
    const skin = (radius: number, colour: THREE.Color, opacity: number) => {
      const geometry = a.shape === 'veil' ? new THREE.SphereGeometry(radius, 40, 24, 0, Math.PI * 2, 0, Math.PI * 0.52) : new THREE.SphereGeometry(radius, 40, 24);
      const mesh = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ color: colour, transparent: true, opacity, depthWrite: false, side: THREE.DoubleSide }));
      if (a.shape === 'veil') mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), bias);
      if (a.shape === 'lopsided') { mesh.quaternion.setFromUnitVectors(new THREE.Vector3(1, 0, 0), bias); mesh.scale.set(1.18, 1, 1); mesh.position.copy(bias).multiplyScalar(radius * 0.16); }
      if (a.shape === 'crab') mesh.scale.set(0.74, 1.08, 0.74);
      shell.add(mesh);
      return mesh;
    };
    skin(R * 0.97, palette[0].clone().lerp(palette[2], 0.5), mix(0.16, 0.07, age));
    if (age < 0.4) skin(R * 0.6, new THREE.Color('#7fb6ff'), mix(0.3, 0.05, age / 0.4)); // a young remnant is still hot inside

    if (a.front === 'shock') {
      const arc = new THREE.Mesh(new THREE.TorusGeometry(R * 0.62, 0.05, 8, 48, Math.PI * 1.5), new THREE.MeshStandardMaterial({ color: '#f2c14a', emissive: '#f2a01e', emissiveIntensity: 0.9 * glow, roughness: 0.4 }));
      arc.castShadow = true;
      arc.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), bias.clone().negate());
      arc.position.copy(bias).multiplyScalar(-R * 0.72);
      shell.add(arc);
      const inner = arc.clone();
      inner.scale.setScalar(0.55);
      inner.position.copy(bias).multiplyScalar(-R * 0.8);
      shell.add(inner);
    }
    if (a.front === 'echoes') {
      const ringPaint = new THREE.MeshStandardMaterial({ color: fade('#c9a640'), emissive: '#c9a640', emissiveIntensity: 0.3 * glow, roughness: 0.6 });
      for (let i = 0; i < 3; i++) {
        const ring = new THREE.Mesh(new THREE.TorusGeometry(R * (1.18 + i * 0.17), 0.014, 6, 96, Math.PI * mix(1.2, 2, random())), ringPaint);
        ring.rotation.set(Math.PI / 2 + (random() - 0.5) * 0.3, 0, random() * 6);
        ring.castShadow = true;
        shell.add(ring);
      }
    }

    // The centre.
    const heart = new THREE.Group();
    s.root.add(heart);
    const dot = (radius: number, material: THREE.Material) => {
      const mesh = new THREE.Mesh(new THREE.SphereGeometry(radius, 20, 14), material);
      heart.add(mesh);
      return mesh;
    };
    const lamp = (colour: string, intensity = 1.2) => new THREE.MeshStandardMaterial({ color: colour, emissive: colour, emissiveIntensity: intensity, roughness: 0.4 });
    const haze = (colour: string, opacity: number) => new THREE.MeshBasicMaterial({ color: colour, transparent: true, opacity, depthWrite: false });
    const c = R * 0.075;
    if (a.centre === 'pulsar') {
      dot(c, lamp('#dff1ff')).castShadow = true;
      dot(c * 2.2, haze('#3f8fe8', 0.3));
      const beam = new THREE.Mesh(new THREE.CylinderGeometry(c * 0.7, c * 0.12, R * 0.9, 12, 1, true), haze('#3f8fe8', 0.5));
      const other = beam.clone();
      beam.position.y = R * 0.45;
      other.position.y = -R * 0.45;
      other.rotation.x = Math.PI;
      const pair = new THREE.Group().add(beam, other);
      pair.rotation.z = 0.9;
      heart.add(pair);
    } else if (a.centre === 'ember') {
      dot(c * 1.3, lamp('#fff1d6', 0.9)).castShadow = true;
      dot(c * 2.6, haze('#e8a04a', 0.28));
      dot(c * 4.2, haze('#e8a04a', 0.12));
    } else if (a.centre === 'void') {
      dot(c * 1.5, new THREE.MeshBasicMaterial({ color: '#0b0b12' }));
      const ring = new THREE.Mesh(new THREE.TorusGeometry(c * 2.4, c * 0.22, 8, 40), lamp('#ffc36a'));
      ring.rotation.x = 1.25;
      heart.add(ring);
    } else if (a.centre === 'glow') {
      const amber = new THREE.MeshStandardMaterial({ color: '#e59a2e', emissive: '#e5791e', emissiveIntensity: 0.8 * glow, roughness: 0.6, flatShading: true });
      for (let i = 0; i < 7; i++) {
        const lump = new THREE.Mesh(new THREE.IcosahedronGeometry(c * mix(1, 2.2, random()), 1), amber);
        lump.position.set((random() - 0.5) * c * 4, (random() - 0.5) * c * 4, (random() - 0.5) * c * 4);
        lump.castShadow = true;
        heart.add(lump);
      }
      dot(c * 5, haze('#e5791e', 0.16));
    }

    // At table scale it is a glass bauble: give it a cap and a hanging loop.
    if (context.scale === 'tabletop' || context.scale === 'macro' || context.scale === 'room') {
      const brass = new THREE.MeshStandardMaterial({ color: '#b8923c', metalness: 0.8, roughness: 0.35 });
      const cap = new THREE.Mesh(new THREE.CylinderGeometry(R * 0.11, R * 0.14, R * 0.12, 20), brass);
      cap.position.y = R * (a.shape === 'crab' ? 1.12 : 1.0);
      cap.castShadow = true;
      const loop = new THREE.Mesh(new THREE.TorusGeometry(R * 0.08, R * 0.014, 6, 24), brass);
      loop.position.y = cap.position.y + R * 0.12;
      s.root.add(cap, loop);
    }

    const pace = mix(0.02, 0.14, mood.energy);
    return s.finish({
      footprint: R * 0.8,
      update(dt, time) {
        shell.rotation.y += dt * pace;
        heart.rotation.y -= dt * pace * 6;
        shell.scale.setScalar(1 + Math.sin(time * pace * 6) * 0.012);
      },
    });
  },
});
