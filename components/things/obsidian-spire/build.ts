import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';

type Vec = readonly [number, number, number];
interface ShardOptions { h: number; R: number; twist: number; bend: readonly [number, number]; sides: number; squash: number; cut: number }

const GLASS = {
  mirror: 'Pure black mirror glass with cold blue-grey highlights.',
  rainbow: 'Rainbow obsidian: oily bands of violet, green and gold in the black.',
  snowflake: 'Snowflake obsidian: black flecked with white crystal blooms.',
  mahogany: 'Mahogany obsidian: black streaked with rust red.',
  ember: 'Smoky glass with veins of ember light still alive inside it.',
} as const;

export default defineThing({
  questions: {
    shape: choice('What shape is the spire?', {
      needle: 'A single straight needle, twisted like a drill.',
      fang: 'A curved fang, hooking over at the tip.',
      cluster: 'A main spire with a crown of smaller shards splayed around its foot.',
      fork: 'Two prongs rising from one root, like a tuning fork or horns.',
      blade: 'A broad flat blade, a knife stood on its handle.',
      snapped: 'Snapped partway up, the top lying shattered beside the stump.',
    }),
    height: score('How tall is it?', ['Waist high', 'Twice a person', 'A tower', 'A needle into the clouds']),
    twist: score('How twisted is it?', ['Straight-grained', 'A quarter turn', 'Wrung like a rag']),
    glass: choice('What kind of volcanic glass is it?', GLASS),
    carving: choice('Has it been carved?', {
      raw: 'Untouched: only natural fracture faces.',
      runes: 'A column of glowing glyphs cut down the front.',
      face: 'A stern face: two slanted eyes and a slit mouth lit from within.',
      stair: 'A spiral of tiny steps cut around it, leading up.',
      niche: 'An arched niche near the base holding a small flame.',
    }),
    offerings: choice('What has been tied to it or left at its foot?', {
      none: 'Nothing. Nobody dares, or nobody comes.',
      ribbons: 'Bright prayer ribbons knotted around it, tails fluttering.',
      chains: 'Iron chains wound around it and padlocked, as if to hold it down.',
      garlands: 'Garlands of orange and yellow flowers.',
      candles: 'A ring of candles burning at the foot.',
      bones: 'Bones and a skull piled at the foot.',
    }),
    footing: choice('What does it rise from?', {
      bare: 'Straight out of bare ground.',
      flakes: 'A litter of razor-edged flakes and chips.',
      dais: 'A stepped stone dais built around its root.',
      fissure: 'A star of glowing cracks split open around it.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const palette = (): THREE.Color => {
      const c = new THREE.Color();
      const roll = random();
      if (a.glass === 'rainbow') return roll < 0.5 ? c.setHSL((0.72 + random() * 0.6) % 1, 0.6, 0.36 + random() * 0.18) : c.set('#211f2b');
      if (a.glass === 'mahogany') return roll < 0.45 ? c.set('#8a341f').multiplyScalar(0.7 + random() * 0.6) : roll < 0.6 ? c.set('#4a3a3c') : c.set('#241a1b');
      if (a.glass === 'ember') return roll < 0.3 ? c.set('#6b4a44') : roll < 0.5 ? c.set('#3d3036') : c.set('#2a2126');
      if (a.glass === 'snowflake') return roll < 0.2 ? c.set('#5a5e68') : roll < 0.45 ? c.set('#33343c') : c.set('#1f1f25');
      return roll < 0.16 ? c.set('#a3aec6') : roll < 0.42 ? c.set('#4a5268') : roll < 0.7 ? c.set('#2b2c3a') : c.set('#1a1921');
    };
    const glass = new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: mix(0.12, 0.45, mood.wear), metalness: 0.3, side: THREE.DoubleSide });
    const warmGlow = new THREE.Color().setHSL(mix(0.52, 0.045, mood.warmth), 1, 0.5);
    const glow = new THREE.MeshStandardMaterial({ color: warmGlow, emissive: warmGlow, emissiveIntensity: 1.1, roughness: 0.5 });

    const makeShard = (o: ShardOptions) => {
      const rings = 12;
      const lobes = Array.from({ length: o.sides }, () => 0.72 + random() * 0.5);
      const taper = (t: number) => Math.max(o.cut, Math.pow(1 - t, 0.8) * (1 + 0.12 * Math.sin(t * 9 + lobes[0] * 5)));
      const centre = (t: number): Vec => [o.bend[0] * t * t, o.h * t, o.bend[1] * t * t];
      const grid: THREE.Vector3[][] = [];
      for (let i = 0; i < rings; i++) {
        const t = i === 0 ? -0.04 : i / (rings - 1);
        const tt = Math.max(t, 0), c = centre(tt), rad = o.R * (t < 1 ? taper(tt) : o.cut) * (i === 0 ? 1.15 : 1);
        grid.push(lobes.map((lobe, k) => {
          const local = (k / o.sides) * Math.PI * 2 + (i > 0 && i < rings - 1 ? (random() - 0.5) * 0.35 : 0);
          const reach = rad * lobe * (0.88 + random() * 0.24);
          const lx = Math.cos(local) * reach, lz = Math.sin(local) * reach * o.squash;
          const turn = o.twist * tt;
          return new THREE.Vector3(c[0] + lx * Math.cos(turn) - lz * Math.sin(turn), t * o.h, c[2] + lx * Math.sin(turn) + lz * Math.cos(turn));
        }));
      }
      const positions: number[] = [], colours: number[] = [];
      const face = (p: THREE.Vector3, q: THREE.Vector3, r: THREE.Vector3) => {
        const c = palette();
        for (const v of [p, q, r]) { positions.push(v.x, v.y, v.z); colours.push(c.r, c.g, c.b); }
      };
      for (let i = 0; i < rings - 1; i++)
        for (let k = 0; k < o.sides; k++) {
          const p = grid[i][k], q = grid[i][(k + 1) % o.sides], r = grid[i + 1][k], u = grid[i + 1][(k + 1) % o.sides];
          if (random() < 0.5) { face(p, q, r); face(q, u, r); } else { face(p, q, u); face(p, u, r); }
        }
      const topRing = grid[rings - 1], tc = centre(1);
      const apex = new THREE.Vector3(tc[0] + (random() - 0.5) * o.R * o.cut, o.h * (1 + (o.cut > 0.01 ? 0.03 : 0)), tc[2]);
      for (let k = 0; k < o.sides; k++) face(topRing[k], topRing[(k + 1) % o.sides], apex);
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      geometry.setAttribute('color', new THREE.Float32BufferAttribute(colours, 3));
      geometry.computeVertexNormals();
      const surface = (t: number, angle: number, out = 1): Vec => {
        const c = centre(t), local = angle - o.twist * t;
        const reach = o.R * taper(t) * 0.92 * out / Math.hypot(Math.cos(local), Math.sin(local) / o.squash);
        return [c[0] + Math.cos(angle) * reach, o.h * t, c[2] + Math.sin(angle) * reach];
      };
      return { geometry, surface, taper };
    };

    const worn = mood.wear > 0.72;
    const H = mix(1.7, 13, a.height) * (a.shape === 'snapped' ? 0.5 : 1);
    const R = (H * 0.085 + 0.28) * (a.shape === 'blade' ? 1.7 : a.shape === 'snapped' ? 1.5 : 1);
    const twist = mix(0.05, 4.2, a.twist) * (random() < 0.5 ? -1 : 1);
    const lean: [number, number] = a.shape === 'fang' ? [H * 0.42, H * 0.1] : [(random() - 0.5) * H * 0.1, (random() - 0.5) * H * 0.1];
    const main = makeShard({ h: H, R, twist, bend: lean, sides: a.shape === 'blade' ? 6 : 5 + Math.floor(random() * 3), squash: a.shape === 'blade' ? 0.34 : 0.8 + random() * 0.2, cut: a.shape === 'snapped' ? 0.6 : worn ? 0.12 : 0 });
    s.mesh(main.geometry, glass);
    const lesser = (h: number, radius: number, at: Vec, tiltX: number, tiltZ: number, cut = 0) => {
      const shard = makeShard({ h, R: radius, twist: twist * 0.5, bend: [0, 0], sides: 5, squash: 0.6 + random() * 0.4, cut });
      const mesh = s.mesh(shard.geometry, glass, at);
      mesh.rotation.set(tiltX, random() * 6, tiltZ);
      return mesh;
    };
    if (a.shape === 'cluster') {
      const n = 4 + Math.floor(random() * 4);
      for (let i = 0; i < n; i++) {
        const angle = (i / n) * Math.PI * 2 + random() * 0.5, d = R * (1 + random() * 0.6), tilt = 0.25 + random() * 0.45;
        lesser(H * (0.2 + random() * 0.3), R * (0.3 + random() * 0.25), [Math.cos(angle) * d, 0, Math.sin(angle) * d], Math.sin(angle) * tilt, -Math.cos(angle) * tilt);
      }
    } else if (a.shape === 'fork') {
      const prong = makeShard({ h: H * (0.7 + random() * 0.25), R: R * 0.85, twist: -twist, bend: [-lean[0] - H * 0.22, -lean[1]], sides: 5, squash: 0.85, cut: 0 });
      s.mesh(prong.geometry, glass, [-R * 0.7, 0, 0]);
    } else if (a.shape === 'snapped') {
      // The fallen top lies broken in two beside the stump.
      const side = random() < 0.5 ? -1 : 1;
      const top = lesser(H * 1.1, R * 0.62, [side * R * 1.5, R * 0.5, R * 0.9], Math.PI / 2 - 0.08, 0);
      top.rotation.set(Math.PI / 2 - 0.1, 0, side * 0.5, 'YXZ');
      for (let i = 0; i < 5; i++) lesser(H * (0.08 + random() * 0.12), R * (0.15 + random() * 0.2), [side * R * (0.8 + random() * 1.4), R * 0.1, -R * (0.3 + random() * 1.2)], 1.2 + random() * 0.4, random() * 3);
    }

    // Surface detail of the glass itself.
    if (a.glass === 'snowflake') {
      const flecks = Array.from({ length: 70 }, () => ({ at: main.surface(random() * 0.9, random() * Math.PI * 2, 0.96), size: R * (0.04 + random() * 0.07) }));
      s.scatter(new THREE.IcosahedronGeometry(1, 0), new THREE.MeshStandardMaterial({ color: '#e9ebee', roughness: 0.6, flatShading: true }), flecks);
    } else if (a.glass === 'ember') {
      const ember = new THREE.MeshStandardMaterial({ color: '#ff7a24', emissive: '#ff4d10', emissiveIntensity: mix(1, 2.2, mood.warmth), roughness: 0.5 });
      for (let i = 0; i < 5; i++) {
        const start = random() * Math.PI * 2, from = random() * 0.3, span = 0.3 + random() * 0.4;
        s.tube(Array.from({ length: 7 }, (_u, j) => main.surface(from + (span * j) / 6, start + twist * ((span * j) / 6) + Math.sin(j * 1.7 + i) * 0.25, 1.0)), R * 0.04, ember);
      }
    }

    // Carving.
    const front = Math.PI / 2;
    const facing = (at: Vec, angle: number) => { const g = new THREE.Group(); g.position.set(...at); g.rotation.y = Math.PI / 2 - angle; s.root.add(g); return g; };
    const part = (g: THREE.Group, size: Vec, at: Vec, material: THREE.Material, roll = 0) => { const m = new THREE.Mesh(new THREE.BoxGeometry(...size), material); m.position.set(...at); m.rotation.z = roll; m.castShadow = true; g.add(m); return m; };
    if (a.carving === 'runes') {
      const n = 7;
      for (let i = 0; i < n; i++) {
        const t = 0.1 + (i / n) * 0.55, u = R * main.taper(t) * 0.5;
        const g = facing(main.surface(t, front, 1.02), front);
        const strokes = 2 + Math.floor(random() * 3);
        for (let k = 0; k < strokes; k++) part(g, [u * (0.3 + random() * 0.7), u * 0.14, 0.03], [(random() - 0.5) * u * 0.5, (random() - 0.5) * u * 0.7, 0], glow, Math.floor(random() * 4) * Math.PI / 4);
      }
    } else if (a.carving === 'face') {
      const t = 0.5, u = R * main.taper(t);
      for (const side of [-1, 1]) part(facing(main.surface(t, front - side * 0.5, 1.02), front - side * 0.5), [u * 0.42, u * 0.13, 0.04], [0, 0, 0], glow, side * -0.45);
      part(facing(main.surface(t - 0.11, front, 1.02), front), [u * 0.6, u * 0.07, 0.04], [0, 0, 0], glow);
      part(facing(main.surface(t - 0.045, front, 1.04), front), [u * 0.1, H * 0.07, 0.06], [0, 0, 0], s.material('#23222a', { roughness: 0.3 }));
    } else if (a.carving === 'stair') {
      const tread = s.material('#4a4b57', { roughness: 0.5, flatShading: true });
      const n = Math.round(mix(10, 34, a.height));
      for (let i = 0; i < n; i++) {
        const t = (i / n) * 0.72, angle = front + i * 0.42;
        part(facing(main.surface(t, angle, 1.05), angle), [Math.max(0.2, R * 0.5), Math.max(0.05, H * 0.012), Math.max(0.18, R * 0.35)], [0, 0, 0], tread);
      }
    } else if (a.carving === 'niche') {
      const t = Math.min(0.2, 0.9 / H + 0.06), u = Math.max(0.35, R * 0.55);
      const g = facing(main.surface(t, front, 1.0), front);
      const frame = s.material('#3f3f4a', { roughness: 0.4 });
      part(g, [u * 1.2, u * 1.6, 0.12], [0, 0, 0], frame);
      part(g, [u * 0.9, u * 1.3, 0.14], [0, -u * 0.05, 0.01], new THREE.MeshStandardMaterial({ color: '#07070a', roughness: 1 }));
      const flame = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 8), glow);
      flame.scale.set(u * 0.16, u * 0.34, u * 0.16);
      flame.position.set(0, -u * 0.3, 0.1);
      g.add(flame);
      part(g, [u * 0.5, u * 0.08, 0.2], [0, -u * 0.62, 0.08], frame);
    }

    // Offerings.
    const swing: THREE.Object3D[] = [];
    const loop = (t: number, out: number, sag = 0) => Array.from({ length: 12 }, (_u, j) => { const p = main.surface(t, (j / 12) * Math.PI * 2, out); return [p[0], p[1] + Math.sin((j / 12) * Math.PI * 2) * sag, p[2]] as const; });
    if (a.offerings === 'ribbons') {
      const hues = mood.cheer > 0.45 ? ['#e23d3d', '#f2b632', '#2f8fd6', '#f4f1e8', '#37a35a'] : ['#8c2f2f', '#b9a98a', '#55606e', '#d9d3c4'];
      const bands = 2 + Math.floor(random() * 3 + mood.density * 2);
      for (let i = 0; i < bands; i++) {
        const t = Math.min(0.75, (0.5 + i * 0.45 + random() * 0.2) / H + 0.08 + i * 0.05);
        const cloth = new THREE.MeshStandardMaterial({ color: hues[Math.floor(random() * hues.length)], roughness: 0.9, side: THREE.DoubleSide });
        s.tube(loop(t, 1.06), Math.max(0.025, R * 0.035), cloth, true);
        for (let k = 0; k < 3; k++) {
          const angle = random() * Math.PI * 2, length = 0.4 + random() * 0.7 + H * 0.03;
          const g = facing(main.surface(t, angle, 1.08), angle);
          const tail = new THREE.Mesh(new THREE.PlaneGeometry(0.09 + H * 0.008, length).translate(0, -length / 2, 0), cloth);
          tail.rotation.x = 0.25 + random() * 0.5;
          tail.castShadow = true;
          g.add(tail);
          swing.push(tail);
        }
      }
    } else if (a.offerings === 'chains') {
      const iron = s.material('#3c3a3a', { metalness: 0.6, roughness: 0.5 });
      const turns = 3;
      s.tube(Array.from({ length: turns * 12 + 1 }, (_u, j) => main.surface(0.06 + (j / (turns * 12)) * 0.5, j * (Math.PI / 6), 1.07)), Math.max(0.03, R * 0.05), iron);
      for (let i = 0; i < 3; i++) {
        const angle = front + (i - 1) * 0.9, t = 0.1 + i * 0.16;
        const g = facing(main.surface(t, angle, 1.12), angle);
        const u = Math.max(0.12, R * 0.2);
        part(g, [u, u * 0.9, u * 0.4], [0, -u * 0.5, 0], s.material('#9a7b2d', { metalness: 0.7, roughness: 0.4 }));
        const shackle = new THREE.Mesh(new THREE.TorusGeometry(u * 0.3, u * 0.07, 6, 12, Math.PI), iron);
        g.add(shackle);
      }
    } else if (a.offerings === 'garlands') {
      const blooms = [];
      for (let band = 0; band < 3; band++) {
        const t = Math.min(0.7, 0.1 + band * (0.12 + 0.6 / H));
        for (let j = 0; j < 30; j++) {
          const angle = (j / 30) * Math.PI * 2;
          const p = main.surface(t, angle, 1.1);
          blooms.push({ at: [p[0], p[1] + Math.sin(angle * 2 + band) * R * 0.25, p[2]] as const, size: Math.max(0.05, R * 0.09) * (0.8 + random() * 0.5), color: random() < 0.6 ? '#f08a1c' : random() < 0.5 ? '#f5c518' : '#d8324a' });
        }
      }
      s.scatter(new THREE.IcosahedronGeometry(1, 0), new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.9, flatShading: true }), blooms);
    } else if (a.offerings === 'candles') {
      const wax = s.material('#efe3c4'), flame = new THREE.MeshStandardMaterial({ color: '#ffd46a', emissive: '#ffae2c', emissiveIntensity: 2.4 });
      const n = 9 + Math.floor(random() * 6);
      for (let i = 0; i < n; i++) {
        const angle = (i / n) * Math.PI * 2 + random() * 0.2, d = R * 1.5 + 0.2 + random() * 0.3, tall = 0.12 + random() * 0.25;
        s.cylinder(0.05, 0.06, tall, [Math.cos(angle) * d, tall / 2, Math.sin(angle) * d], wax, 8);
        swing.push(s.ball([0.04, 0.09, 0.04], [Math.cos(angle) * d, tall + 0.08, Math.sin(angle) * d], flame, 8));
      }
    } else if (a.offerings === 'bones') {
      const bone = s.material('#e3dcc8', { roughness: 0.8 });
      for (let i = 0; i < 14; i++) {
        const angle = random() * Math.PI * 2, d = R * 1.3 + 0.2 + random() * 0.5, len = 0.25 + random() * 0.3;
        const x = Math.cos(angle) * d, z = Math.sin(angle) * d, turn = random() * Math.PI;
        s.rod([x - Math.cos(turn) * len / 2, 0.04 + random() * 0.08, z - Math.sin(turn) * len / 2], [x + Math.cos(turn) * len / 2, 0.04, z + Math.sin(turn) * len / 2], 0.03, bone);
      }
      const sx = Math.cos(front - 0.4) * (R * 1.3 + 0.3), sz = Math.sin(front - 0.4) * (R * 1.3 + 0.3);
      s.ball([0.11, 0.12, 0.13], [sx, 0.13, sz], bone, 12);
      s.box([0.1, 0.07, 0.1], [sx, 0.045, sz + 0.05], bone);
      for (const e of [-1, 1]) s.ball([0.025, 0.03, 0.02], [sx + e * 0.045, 0.14, sz + 0.115], s.material('#1b1a1a'), 6);
    }

    // Footing.
    if (a.footing === 'flakes' || a.shape === 'snapped') {
      const chips = Array.from({ length: Math.round(mix(18, 60, mood.density)) }, () => { const angle = random() * Math.PI * 2, d = R * (1.1 + random() * 1.6); return { at: [Math.cos(angle) * d, 0.02, Math.sin(angle) * d] as const, size: R * (0.06 + random() * 0.2), color: random() < 0.25 ? '#59607a' : '#1b1a22' }; });
      const chip = new THREE.TetrahedronGeometry(1, 0).scale(1, 0.35, 0.7);
      s.scatter(chip, new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.2, metalness: 0.3, flatShading: true }), chips);
    }
    if (a.footing === 'dais') {
      const slab = s.material('#6d6a68', { roughness: 0.9, flatShading: true });
      s.cylinder(R * 2.3, R * 2.4, 0.22, [0, 0.11, 0], slab, 6);
      s.cylinder(R * 1.7, R * 1.8, 0.2, [0, 0.32, 0], slab, 6);
    } else if (a.footing === 'fissure') {
      const crack = new THREE.MeshStandardMaterial({ color: '#e8501a', emissive: '#c8320a', emissiveIntensity: 0.7, roughness: 0.7 });
      const n = 5 + Math.floor(random() * 3);
      for (let i = 0; i < n; i++) {
        const angle = (i / n) * Math.PI * 2 + random() * 0.5, len = R * (1.6 + random() * 1.6);
        let px = Math.cos(angle) * R * 0.5, pz = Math.sin(angle) * R * 0.5, heading = angle;
        const steps = 4;
        for (let k = 0; k < steps; k++) {
          heading = angle + (random() - 0.5) * 1.1;
          const nx = px + Math.cos(heading) * len / steps, nz = pz + Math.sin(heading) * len / steps;
          const wide = Math.max(0.04, R * 0.09) * (1 - k / (steps + 1));
          s.rod([px, 0.012, pz], [nx, 0.012, nz], wide, crack, wide * 0.7);
          px = nx; pz = nz;
        }
      }
    }

    const breeze = mix(0.4, 3, mood.energy);
    return s.finish({
      footprint: R * 2.4,
      update: (_dt, time) => {
        glow.emissiveIntensity = 1.1 + Math.sin(time * breeze) * 0.25;
        swing.forEach((item, i) => {
          if (a.offerings === 'ribbons') item.rotation.x = 0.4 + Math.sin(time * breeze * 1.6 + i * 1.3) * 0.22 * (0.4 + mood.energy);
          else item.scale.y = 0.09 * (1 + Math.sin(time * breeze * 4 + i * 2.1) * 0.18);
        });
      },
    });
  },
});
