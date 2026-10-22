import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul, score } from '@conjure/kit';

/** Position-based lumps, so lathe seams stay closed. */
function roughen(geometry: THREE.BufferGeometry, amount: number, frequency: number, seed: number) {
  const p = geometry.attributes.position as THREE.BufferAttribute;
  const v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const n =
      Math.sin(v.x * frequency + seed) * Math.cos(v.z * frequency * 1.3 + seed * 1.7) +
      Math.sin(v.y * frequency * 1.7 + seed * 0.6 + v.x * frequency * 0.5) * 0.6 +
      Math.sin((v.x + v.z) * frequency * 2.9 + seed * 2.3) * 0.35;
    const len = Math.hypot(v.x, v.z) || 1;
    p.setXYZ(i, v.x + (v.x / len) * n * amount, v.y + n * amount * 0.35, v.z + (v.z / len) * n * amount);
  }
  geometry.computeVertexNormals();
  return geometry;
}

const LAVAS = {
  basalt: { say: 'Runny orange-yellow basalt, the classic bright fountain.', core: '#ffe27a', mid: '#ff7d1c', cool: '#b3260a' },
  whitehot: { say: 'Blinding white-gold, hotter than rock should be.', core: '#fffbe0', mid: '#ffc24a', cool: '#e56a1a' },
  sullen: { say: 'Thick dull red, slow and heavy like clotting blood.', core: '#ff8c3c', mid: '#d43c14', cool: '#6e1608' },
  sulphur: { say: 'Eerie electric blue, burning sulphur instead of rock.', core: '#dff6ff', mid: '#3aa8ff', cool: '#2440b8' },
  verdant: { say: 'Uncanny green-gold, an alien chemistry.', core: '#f4ffd0', mid: '#9be33a', cool: '#2f7d1f' },
} as const;

export default defineThing({
  questions: {
    style: choice('What shape does the eruption take?', {
      jet: 'One tall narrow jet, a single roaring column.',
      curtain: 'A curtain of fire: a row of jets side by side.',
      twin: 'Two jets leaning apart like horns.',
      dome: 'A low fat dome of lava bulging and bursting.',
      sputter: 'No column, only spat blobs and short arcs, coughing.',
    }),
    vent: choice('What does it erupt from?', {
      spatter: 'A low ragged spatter cone built from its own fallout.',
      hornito: 'A tall thin chimney of welded spatter.',
      fissure: 'A long open crack in flat ground, no cone at all.',
      breached: 'A horseshoe cone with one wall broken open, lava spilling out the gap.',
    }),
    lava: choice('What is the molten material like?', Object.fromEntries(Object.entries(LAVAS).map(([k, v]) => [k, v.say])) as Record<keyof typeof LAVAS, string>),
    state: choice('What stage is the eruption at?', {
      roaring: 'In full voice, at its height.',
      waking: 'Just begun: a short jet and glowing cracks spreading down the cone.',
      waning: 'Dying down, the jet low and the lava skinning over.',
      frozen: 'Stopped and solidified mid-leap: a black glass sculpture of a fountain.',
    }),
    pool: choice('What lies at its foot?', {
      none: 'Bare rock, nothing pooled.',
      pond: 'A glowing molten pond all around the vent.',
      crusted: 'A pond skinned with dark plates, light showing in the cracks between.',
      river: 'A stream of lava running away from it toward the viewer.',
    }),
    bombs: score('How much fallen spatter and how many lava bombs litter the ground?', ['Clean ground', 'A few lumps', 'Strewn', 'Buried in fallout']),
    fumes: noul('Does a column of fume and ash rise above it?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const seed = random() * 50;
    const frozen = a.state === 'frozen';
    const lava = LAVAS[a.lava];
    const glowPower = frozen ? 0 : mix(0.9, 1.7, mood.warmth) * (a.state === 'waning' ? 0.75 : 1);
    const glass = new THREE.MeshStandardMaterial({ color: '#2a2630', roughness: 0.15, metalness: 0.5, flatShading: true });
    const hot = (colour: string, power = 1) =>
      frozen ? glass : new THREE.MeshStandardMaterial({ color: colour, emissive: colour, emissiveIntensity: glowPower * power, roughness: 0.55 });
    const core = hot(lava.core, 1.15), mid = hot(lava.mid), cool = hot(lava.cool, 0.8);
    const rock = new THREE.MeshStandardMaterial({ color: new THREE.Color('#3b3334').lerp(new THREE.Color('#5a4a42'), mood.wear * 0.5), roughness: 0.95, flatShading: true, side: THREE.DoubleSide });
    const cinder = new THREE.MeshStandardMaterial({ color: '#2a2526', roughness: 1, flatShading: true });

    // Vent.
    const dims = { spatter: [3.3, 1.7, 1.1], hornito: [1.7, 4.4, 0.55], fissure: [3.4, 0.45, 0.6], breached: [3.6, 2.3, 1.3] }[a.vent];
    const [R, h, r] = dims;
    if (a.vent === 'fissure') {
      for (const side of [-1, 1]) {
        const ridge = s.mesh(roughen(new THREE.SphereGeometry(1, 18, 10), 0.22, 2.4, seed + side), rock, [0, 0.05, side * 0.95]);
        ridge.scale.set(R * 1.05, 0.55, 0.75);
      }
      s.box([R * 1.75, 0.12, 1.0], [0, 0.3, 0], mid);
      for (let i = 0; i < 5; i++) {
        const x = (random() - 0.5) * R * 2.6, z = (random() < 0.5 ? -1 : 1) * (1.5 + random() * 0.8);
        s.rod([x, 0.03, z], [x + (random() - 0.5) * 1.5, 0.03, z * (1.5 + random() * 0.5)], 0.07, cool, 0.02);
      }
    } else {
      const profile: [number, number][] = [[R, 0], [R * 0.82, h * 0.3], [r * 1.7, h * 0.72], [r * 1.15, h], [r * 0.9, h * 0.94], [r * 0.6, h * 0.6]];
      const gap = a.vent === 'breached' ? 1.25 : 0;
      const cone = new THREE.LatheGeometry(profile.map(([x, y]) => new THREE.Vector2(x, y)), 30, gap / 2, Math.PI * 2 - gap);
      s.mesh(roughen(cone, a.vent === 'hornito' ? 0.16 : 0.24, 2.1, seed), rock);
      s.cylinder(r * 0.95, r * 0.95, 0.12, [0, h * 0.74, 0], core, 20);
      if (a.vent === 'breached') {
        const tongue = s.mesh(roughen(new THREE.SphereGeometry(1, 16, 8), 0.12, 1.6, seed), mid, [0, 0.08, R * 0.75]);
        tongue.scale.set(r * 0.85, 0.22, R * 0.85);
        s.box([r * 1.3, h * 0.7, 0.3], [0, h * 0.36, r * 0.4], mid).rotation.x = -0.5;
      }
      // Glowing cracks run down the flank.
      const cracks = { roaring: 3, waking: 8, waning: 1, frozen: 0 }[a.state];
      for (let i = 0; i < cracks; i++) {
        const angle = gap / 2 + 0.3 + random() * (Math.PI * 2 - gap - 0.6);
        const reach = 0.45 + random() * 0.55;
        const pts = profile.slice(0, 4).reverse().map(([x, y], j) => {
          const t = j / 3, wander = angle + Math.sin(j * 2.1 + i) * 0.12;
          const px = mix(profile[3][0], x, reach) * (t === 0 ? 1 : 1), py = mix(profile[3][1], y, reach);
          return [Math.sin(wander) * px * 1.03, py + 0.02, Math.cos(wander) * px * 1.03] as const;
        });
        s.tube(pts, 0.06 + random() * 0.05, mid);
      }
    }
    const base = a.vent === 'fissure' ? 0.3 : h * 0.78;

    // Pool at the foot.
    if (a.pool !== 'none') {
      const shape = new THREE.Shape();
      const long = a.pool === 'river';
      for (let i = 0; i <= 40; i++) {
        const t = (i / 40) * Math.PI * 2;
        const rad = (R * 1.32 + Math.sin(t * 3 + seed) * 0.35 + Math.sin(t * 7 + seed * 2) * 0.18) * (long ? 0.55 : 1);
        const x = Math.cos(t) * rad, y = Math.sin(t) * rad * (long ? 1 : 0.92) - (long ? Math.max(0, -Math.sin(t)) * R * 1.7 : 0);
        if (i === 0) shape.moveTo(x, y); else shape.lineTo(x, y);
      }
      const pond = s.mesh(new THREE.ShapeGeometry(shape), a.pool === 'crusted' ? cool : mid, [0, 0.04, 0]);
      pond.rotation.x = -Math.PI / 2;
      if (long) pond.position.z = R * 0.5;
      (pond.material as THREE.Material).side = THREE.DoubleSide;
      if (a.pool === 'crusted' || a.state === 'waning') {
        const plates = [];
        const count = a.pool === 'crusted' ? 46 : 16;
        for (let i = 0; i < count; i++) {
          const t = random() * Math.PI * 2, d = R * (long ? 0.2 + random() * 0.3 : 0.95 + random() * 0.32);
          plates.push({ at: [Math.cos(t) * d, 0.05, Math.sin(t) * d * 0.9 + (long ? R * 0.5 + random() * R * 1.4 : 0)] as const, size: 0.22 + random() * 0.3 });
        }
        const plate = new THREE.CylinderGeometry(1, 1.1, 0.12, 6);
        s.scatter(plate, cinder, plates);
      }
    }

    // Fallen spatter and bombs.
    const lumps = Math.round(a.bombs * 34 + mood.density * 6);
    if (lumps > 0) {
      type Dot = { at: readonly [number, number, number]; size: number };
      const dark: Dot[] = [], warm: Dot[] = [];
      for (let i = 0; i < lumps; i++) {
        const t = random() * Math.PI * 2, d = R * (0.85 + random() * 0.85);
        const size = 0.12 + random() * random() * 0.5;
        (random() < 0.3 && !frozen ? warm : dark).push({ at: [Math.cos(t) * d, size * 0.45, Math.sin(t) * d] as const, size });
      }
      const lump = roughen(new THREE.DodecahedronGeometry(1, 0), 0.15, 3, seed);
      if (dark.length) s.scatter(lump, cinder, dark);
      if (warm.length) s.scatter(lump.clone(), cool, warm);
    }

    // The fountain itself.
    const vigour = { roaring: 1, waking: 0.5, waning: 0.32, frozen: 0.85 }[a.state];
    const H = mix(4.6, 11, mood.energy) * vigour * { jet: 1, curtain: 0.7, twin: 0.8, dome: 0.3, sputter: 0.4 }[a.style];
    const spread = a.vent === 'fissure' ? R * 0.72 : r * 0.55;
    const jets: { x: number; lean: number; h: number; w: number }[] =
      a.style === 'curtain' ? [-1, -0.5, 0, 0.5, 1].map((u) => ({ x: u * spread, lean: u * 0.12, h: H * (0.7 + random() * 0.5), w: 0.42 }))
      : a.style === 'twin' ? [-1, 1].map((u) => ({ x: u * spread * 0.5, lean: u * 0.3, h: H * (0.85 + random() * 0.3), w: 0.5 }))
      : [{ x: 0, lean: (random() - 0.5) * 0.08, h: H, w: a.style === 'dome' ? 1 : 0.6 }];
    const width = Math.min(r, 1.1);
    const columns: { mesh: THREE.Mesh; y: number; sy: number; phase: number }[] = [];
    for (const jet of jets) {
      if (a.style === 'dome') {
        const dome = s.ball([width * 1.25, jet.h * 0.8 + 0.5, width * 1.25], [jet.x, base, 0], mid, 20);
        columns.push({ mesh: dome, y: base, sy: dome.scale.y, phase: random() * 6 });
        s.ball([width * 0.7, jet.h + 0.6, width * 0.7], [jet.x, base, 0], core, 16);
      } else if (a.style !== 'sputter') {
        const n = 7;
        for (let i = 0; i < n; i++) {
          const t = i / (n - 1);
          const rad = width * jet.w * 1.35 * mix(1, 0.34, t) * (0.9 + random() * 0.25);
          const y = base + jet.h * t * 0.92;
          const ball = s.ball([rad, (jet.h / n) * 0.95, rad], [jet.x + jet.lean * jet.h * t + (random() - 0.5) * 0.12 * t, y, (random() - 0.5) * 0.15 * t], t < 0.3 ? core : t < 0.75 ? mid : cool, 12);
          columns.push({ mesh: ball, y, sy: ball.scale.y, phase: random() * 6 });
        }
      }
      // Falling strands arc out of each jet.
      const strands = a.style === 'sputter' ? 3 : a.style === 'curtain' ? 3 : 7;
      for (let i = 0; i < strands; i++) {
        const angle = random() * Math.PI * 2, reach = (R * 0.45 + random() * R * 0.75) * (a.style === 'curtain' ? 0.7 : 1);
        const apex = jet.h * (0.55 + random() * 0.5);
        const pts = Array.from({ length: 8 }, (_u, j) => {
          const u = j / 7;
          return [jet.x + jet.lean * apex * u + Math.cos(angle) * reach * u, Math.max(0.03, base * (1 - u) + 4 * apex * u * (1 - u)), Math.sin(angle) * reach * u] as const;
        });
        s.tube(pts, 0.05 + random() * 0.07, i % 2 ? mid : cool);
      }
    }

    // Flying blobs on ballistic arcs.
    const count = Math.round(mix(26, 110, mood.energy) * (a.style === 'sputter' ? 0.6 : 1) * (frozen ? 0.5 : 1));
    const blobMaterial = frozen ? glass : new THREE.MeshBasicMaterial({ color: '#ffffff' });
    const blobs = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 1), blobMaterial, count);
    blobs.castShadow = true;
    blobs.frustumCulled = false;
    const g = 9.8;
    const flight = Array.from({ length: count }, () => {
      const jet = jets[Math.floor(random() * jets.length)];
      const top = Math.max(jet.h, 1.2) * (0.5 + random() * 0.6);
      const v0 = Math.sqrt(2 * g * top);
      const T = (v0 + Math.sqrt(v0 * v0 + 2 * g * base)) / g;
      const angle = random() * Math.PI * 2;
      const reach = (0.25 + random() * 1.1) * R * (a.style === 'curtain' ? 0.6 : 1);
      return { x: jet.x, v0, T, vx: Math.cos(angle) * reach / T + jet.lean * 2, vz: Math.sin(angle) * reach / T, phase: random(), size: 0.07 + random() * random() * 0.24 };
    });
    const matrix = new THREE.Matrix4(), tint = new THREE.Color();
    const cCore = new THREE.Color(lava.core), cMid = new THREE.Color(lava.mid), cCool = new THREE.Color(lava.cool);
    const pose = (time: number) => {
      flight.forEach((f, i) => {
        const u = (time / f.T + f.phase) % 1, t = u * f.T;
        const stretch = 1 + Math.abs(f.v0 - g * t) * 0.06;
        matrix.makeScale(f.size, f.size * stretch, f.size).setPosition(f.x + f.vx * t, Math.max(0.05, base + f.v0 * t - 0.5 * g * t * t), f.vz * t);
        blobs.setMatrixAt(i, matrix);
        if (!frozen) blobs.setColorAt(i, u < 0.4 ? tint.copy(cCore).lerp(cMid, u / 0.4) : tint.copy(cMid).lerp(cCool, (u - 0.4) / 0.6));
      });
      blobs.instanceMatrix.needsUpdate = true;
      if (blobs.instanceColor) blobs.instanceColor.needsUpdate = true;
    };
    pose(seed);
    s.root.add(blobs);

    // Fume column.
    const puffs: THREE.Mesh[] = [];
    if (a.fumes && !frozen) {
      const smoke = new THREE.MeshStandardMaterial({ color: frozen ? '#8d8a88' : '#6b5a55', transparent: true, opacity: 0.2, depthWrite: false, roughness: 1 });
      const top = base + Math.max(H, 1.5);
      for (let i = 0; i < 8; i++) {
        const size = 0.7 + i * 0.32 + random() * 0.4;
        puffs.push(s.ball([size, size * 0.8, size], [(random() - 0.5) * 0.8 + 0.6 + i * 0.5, top + 0.6 + i * 0.8, (random() - 0.5) * 0.8], smoke, 12));
      }
    }

    const speed = mix(0.45, 1.25, mood.energy) * (a.state === 'waning' ? 0.7 : 1);
    return s.finish({
      footprint: R * 1.35,
      update: frozen ? undefined : (_dt, time) => {
        pose(seed + time * speed);
        for (const c of columns) {
          const beat = Math.sin(time * speed * 7 + c.phase);
          c.mesh.scale.y = c.sy * (1 + beat * 0.12);
          c.mesh.position.y = c.y + beat * 0.08;
        }
        puffs.forEach((puff, i) => { puff.position.x += Math.sin(time * 0.6 + i) * 0.0015; });
      },
    });
  },
});
