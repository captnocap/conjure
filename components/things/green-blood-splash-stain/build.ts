import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul, score } from '@conjure/kit';

type Rand = () => number;
type XZ = [number, number];

/** A wobbly closed outline for a puddle, built from a ring of noisy radii. */
function blob(random: Rand, r: number, wobble: number, stretch: XZ = [1, 1], angle = 0, points = 26) {
  const shape = new THREE.Shape();
  const bumps = [random() * 6.3, random() * 6.3, random() * 6.3];
  const c = Math.cos(angle), s = Math.sin(angle);
  for (let i = 0; i <= points; i++) {
    const t = (i / points) * Math.PI * 2;
    const rr = r * (1 + wobble * (0.5 * Math.sin(t * 3 + bumps[0]) + 0.3 * Math.sin(t * 5 + bumps[1]) + 0.2 * Math.sin(t * 8 + bumps[2])));
    const x = Math.cos(t) * rr * stretch[0], y = Math.sin(t) * rr * stretch[1];
    const px = x * c - y * s, py = x * s + y * c;
    if (i === 0) shape.moveTo(px, py); else shape.lineTo(px, py);
  }
  return shape;
}

/** A tapering streak from `from` toward `to`: a drag mark or a long smear. */
function streak(random: Rand, from: XZ, to: XZ, width: number) {
  const shape = new THREE.Shape();
  const dx = to[0] - from[0], dy = to[1] - from[1], len = Math.hypot(dx, dy) || 0.001;
  const nx = -dy / len, ny = dx / len;
  const side = (t: number, sign: number) => {
    const w = width * (1 - t * 0.75) * (0.7 + 0.3 * Math.sin(t * 11 + random() * 3)) * sign;
    return [from[0] + dx * t + nx * w, from[1] + dy * t + ny * w];
  };
  const steps = 10;
  for (let i = 0; i <= steps; i++) { const [x, y] = side(i / steps, 1); if (i === 0) shape.moveTo(x, y); else shape.lineTo(x, y); }
  for (let i = steps; i >= 0; i--) { const [x, y] = side(i / steps, -1); shape.lineTo(x, y); }
  return shape;
}

export default defineThing({
  questions: {
    age: choice('How fresh is the blood?', {
      fresh: 'Fresh and wet, glossy, with a sheen on the pool.',
      tacky: 'An hour old: tacky, darkening at the edges.',
      dried: 'Dried to a dull, cracked crust.',
      old: 'Days old, faded almost to a shadow in the dirt.',
    }),
    story: choice('What happened here?', {
      pooled: 'Something lay here and bled: one round pool and nothing else.',
      dragged: 'A pool with long drag marks where a body was hauled away.',
      fight: 'Spatter flung in every direction, the ground scuffed and churned.',
      trail: 'A pool and a line of drips leading off, as if it limped away.',
      arc: 'A single sweeping arc of spray, as from one blow.',
    }),
    direction: choice('If marks lead away, which way do they run?', {
      toward: 'Toward the viewer.',
      away: 'Away from the viewer.',
      left: 'Off to the left.',
      right: 'Off to the right.',
    }),
    print: choice('Is there a print beside it?', {
      none: 'No print.',
      claw: 'A single three-toed clawed print in blood.',
      hoof: 'A cloven hoof print.',
      boot: 'A boot print, as if someone stepped in it.',
      hand: 'A smeared hand print, fingers dragged.',
    }),
    shade: choice('What shade of green is it?', {
      bottle: 'Dark bottle green.',
      acid: 'Bright acid green, almost luminous.',
      oil: 'Black-green, nearly oil.',
      teal: 'Blue-green teal.',
    }),
    stones: noul('Are there stones in it, stained green?'),
    size: score('How big is the splash?', ['A hand-sized spatter', 'The size of a doormat', 'A pool you could lie in', 'A slick spreading across the ground']),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { random, mood } = context;
    const R = mix(0.12, 1.6, a.size ** 1.3);
    const base = new THREE.Color({ bottle: '#1a4a2a', acid: '#4fbf2f', oil: '#101f14', teal: '#1d5f58' }[a.shade]);
    const aged = { fresh: 0, tacky: 0.25, dried: 0.6, old: 0.9 }[a.age];
    const tone = base.clone().lerp(new THREE.Color('#6a6a52'), aged * 0.55);
    const gloss = { fresh: 0.12, tacky: 0.35, dried: 0.9, old: 1 }[a.age];
    const blood = s.material(tone, { roughness: gloss, metalness: a.age === 'fresh' ? 0.15 : 0, emissive: a.shade === 'acid' ? '#2f8a1a' : '#000000', emissiveIntensity: a.shade === 'acid' ? mix(0.25, 0.05, aged) : 0 });
    const thin = s.material(tone.clone().lerp(new THREE.Color('#8b8f74'), 0.25), { roughness: Math.min(1, gloss + 0.2) });
    const flat = (shape: THREE.Shape, material: THREE.Material, height = 0.006) => {
      const geometry = new THREE.ExtrudeGeometry(shape, { depth: height, bevelEnabled: false });
      geometry.rotateX(-Math.PI / 2);
      geometry.translate(0, height, 0);
      return s.mesh(geometry, material, [0, 0, 0]);
    };
    const dir = { toward: 0, away: Math.PI, left: Math.PI / 2, right: -Math.PI / 2 }[a.direction];
    const ux = Math.sin(dir), uz = Math.cos(dir);

    // The main pool, thinner at its edges.
    const pool = a.story === 'arc' ? R * 0.35 : R;
    flat(blob(random, pool * 0.95, 0.22), blood, 0.008);
    flat(blob(random, pool * 1.08, 0.3), thin, 0.004);

    // Spatter: small flung drops thinning with distance.
    const drops: { at: [number, number, number]; size: number }[] = [];
    const spit = (count: number, spread: number, along: number) => {
      for (let i = 0; i < count; i++) {
        const t = random() ** 1.6, ang = along + (random() - 0.5) * spread;
        const d = pool * mix(0.9, 2.6, t);
        drops.push({ at: [Math.sin(ang) * d, 0, Math.cos(ang) * d], size: pool * mix(0.1, 0.028, t) * mix(0.7, 1.3, random()) });
      }
    };
    if (a.story === 'fight') spit(Math.round(mix(28, 60, mood.energy)), Math.PI * 2, 0);
    else if (a.story === 'arc') {
      const n = 34;
      for (let i = 0; i < n; i++) {
        const t = i / (n - 1), ang = dir + mix(-1.2, 1.2, t), d = R * mix(0.9, 1.5, Math.sin(t * Math.PI) ** 0.5) * mix(0.9, 1.1, random());
        drops.push({ at: [Math.sin(ang) * d, 0, Math.cos(ang) * d], size: R * mix(0.05, 0.11, Math.sin(t * Math.PI)) });
      }
      spit(10, 1.2, dir);
    } else if (a.story === 'trail') {
      const n = 7 + Math.floor(random() * 5);
      for (let i = 0; i < n; i++) {
        const d = pool * (1.1 + i * 0.55), w = (random() - 0.5) * pool * 0.35;
        drops.push({ at: [ux * d - uz * w, 0, uz * d + ux * w], size: pool * mix(0.16, 0.07, i / n) * mix(0.7, 1.2, random()) });
      }
      spit(6, 0.8, dir);
    } else spit(a.story === 'dragged' ? 8 : 6, Math.PI * 2, 0);
    if (drops.length) {
      const disc = new THREE.CylinderGeometry(1, 1, 0.004, 10);
      disc.translate(0, 0.002, 0);
      // Flat ellipses, each stretched a little along a random heading.
      const mesh = new THREE.InstancedMesh(disc, blood, drops.length);
      const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
      drops.forEach((drop, i) => {
        e.set(0, random() * Math.PI, 0);
        m.compose(new THREE.Vector3(...drop.at), q.setFromEuler(e), new THREE.Vector3(drop.size * mix(1, 1.8, random()), 1, drop.size));
        mesh.setMatrixAt(i, m);
      });
      mesh.instanceMatrix.needsUpdate = true;
      mesh.castShadow = mesh.receiveShadow = true;
      s.root.add(mesh);
    }

    // Drag marks: two or three long parallel smears leaving the pool.
    if (a.story === 'dragged') {
      const n = 2 + Math.floor(random() * 2), len = pool * mix(2.2, 3.2, random());
      for (let i = 0; i < n; i++) {
        const off = (i - (n - 1) / 2) * pool * 0.42 + (random() - 0.5) * pool * 0.1;
        const from: XZ = [-uz * off + ux * pool * 0.5, ux * off + uz * pool * 0.5];
        const to: XZ = [from[0] + ux * len * mix(0.8, 1, random()), from[1] + uz * len * mix(0.8, 1, random())];
        // Shape space is x/y; after the extrude is laid flat its y runs along -z, so flip.
        flat(streak(random, [from[0], -from[1]], [to[0], -to[1]], pool * 0.16), i % 2 ? thin : blood, 0.005);
      }
    }
    if (a.story === 'fight') for (let i = 0; i < 5; i++) {
      const ang = random() * Math.PI * 2, d0 = pool * mix(0.3, 0.9, random()), len = pool * mix(0.5, 1.3, random());
      flat(streak(random, [Math.sin(ang) * d0, -Math.cos(ang) * d0], [Math.sin(ang) * (d0 + len), -Math.cos(ang) * (d0 + len)], pool * 0.09), thin, 0.005);
    }

    // Stones that caught the splash, green on their upward faces, and a few clean ones.
    if (a.stones) {
      const rock = s.material('#8d877b', { roughness: 0.95, flatShading: true });
      const n = 4 + Math.floor(random() * 5);
      for (let i = 0; i < n; i++) {
        const ang = random() * Math.PI * 2, d = pool * mix(0.2, 1.3, random()), r = pool * mix(0.07, 0.16, random());
        const stone = s.mesh(new THREE.IcosahedronGeometry(1, 1), rock, [Math.sin(ang) * d, r * 0.45, Math.cos(ang) * d]);
        stone.scale.set(r * mix(1, 1.5, random()), r * 0.7, r);
        stone.rotation.set(random(), random() * 3, random() * 0.5);
        if (d < pool * 1.05 || random() < 0.4) {
          const cap = s.mesh(new THREE.SphereGeometry(1, 10, 6, 0, Math.PI * 2, 0, Math.PI * 0.45), blood, [stone.position.x, r * 0.4, stone.position.z]);
          cap.scale.set(stone.scale.x * 1.02, r * 0.68, stone.scale.z * 1.02);
          cap.rotation.y = stone.rotation.y;
        }
      }
    }

    // One print, set just outside the pool, pointing the way things went.
    if (a.print !== 'none') {
      const px = ux * pool * 1.35 - uz * pool * 0.5, pz = uz * pool * 1.35 + ux * pool * 0.5;
      const printScale = Math.max(0.08, Math.min(0.32, pool * 0.45));
      const group = new THREE.Group();
      group.position.set(px, 0, pz);
      group.rotation.y = dir + (random() - 0.5) * 0.6;
      const part = (w: number, l: number, x: number, z: number, material = blood) => {
        const geometry = new THREE.CylinderGeometry(1, 1, 0.004, 10);
        geometry.translate(0, 0.002, 0);
        const m = s.mesh(geometry, material, [x * printScale, 0, z * printScale]);
        m.scale.set(w * printScale, 1, l * printScale);
        group.add(m);
        return m;
      };
      if (a.print === 'claw') {
        part(0.42, 0.3, 0, 0);
        for (const [x, z, r] of [[-0.3, 0.45, 0.4], [0, 0.6, 0], [0.3, 0.45, -0.4]] as const) part(0.11, 0.3, x, z).rotation.y = r;
        for (const [x, z] of [[-0.42, 0.72], [0, 0.95], [0.42, 0.72]] as const) part(0.05, 0.1, x, z);
      } else if (a.print === 'hoof') {
        part(0.2, 0.42, -0.14, 0).rotation.y = 0.15;
        part(0.2, 0.42, 0.14, 0).rotation.y = -0.15;
      } else if (a.print === 'boot') {
        part(0.3, 0.45, 0, 0.3, thin);
        part(0.26, 0.2, 0, -0.35, thin);
        for (let i = 0; i < 5; i++) part(0.22, 0.03, 0, 0.1 + i * 0.1, blood);
      } else {
        part(0.3, 0.32, 0, 0, thin);
        for (let i = 0; i < 4; i++) { const f = part(0.06, 0.55, -0.24 + i * 0.16, 0.45, thin); f.rotation.y = (1.5 - i) * 0.12; }
        part(0.08, 0.3, 0.32, 0.1, thin).rotation.y = -0.6;
      }
      s.root.add(group);
    }

    // Old blood soaks outward into the soil as a faint halo.
    if (aged > 0.5) flat(blob(random, pool * 1.35, 0.35), s.material(tone.clone().lerp(new THREE.Color('#7d7a62'), 0.6), { roughness: 1 }), 0.002);

    return s.finish({ footprint: pool * 1.2 });
  },
});
