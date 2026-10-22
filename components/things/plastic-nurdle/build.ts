import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul } from '@conjure/kit';
import { SAND, bed, lump, strew, type Speck } from './grains';

const COLOURS = {
  milky: 'Milky translucent white, fresh from the sack.',
  yellowed: 'Aged yellow to amber, years adrift.',
  black: 'Dull black.',
  blue: 'Pale swimming-pool blue.',
  mixed: 'A mix of white, yellow, blue, green and red: several spills on one beach.',
} as const;
const TINTS: Record<keyof typeof COLOURS, string[]> = {
  milky: ['#f4f2ea', '#eceae0'], yellowed: ['#e8c468', '#d9a441', '#efdc9c'], black: ['#2c2c30', '#3a3a3e'], blue: ['#8fc7e8', '#a8d8ee'],
  mixed: ['#f4f2ea', '#e8c468', '#3f8fe0', '#3fae6a', '#e04848', '#f4f2ea'],
};
const SANDS = {
  pale: 'Pale tan beach sand.',
  white: 'White shell and coral sand, where every pellet hides.',
  volcanic: 'Black volcanic sand, where every pellet shouts.',
  shingle: 'Coarse grey grit and tiny pebbles.',
} as const;
const SAND_OF: Record<keyof typeof SANDS, readonly string[]> = {
  pale: SAND.tan, white: SAND.pale, volcanic: ['#2e2d30', '#3d3a3a', '#262629', '#4a4642', '#39413a'], shingle: ['#8c8a86', '#a39f98', '#6f6e6c', '#b9b3a8', '#7b7468'],
};
const ROPES = { strand: ['#1f6fd6', '#3b8bea'], tangle: ['#1f6fd6', '#18a58c', '#3b8bea'], twine: ['#f07a1c', '#f59a3c'], net: ['#1f9a62', '#27b877'] } as const;

export default defineThing({
  questions: {
    count: choice('How many pellets are there?', {
      one: 'A single pellet, nearly missed.',
      three: 'Three together.',
      handful: 'A handful, eight or so, gathered in a hollow.',
      drift: 'Dozens, a drift of them along the tide mark.',
    }),
    colour: choice('What colour are they?', COLOURS),
    shape: choice('What shape is a pellet?', {
      lentil: 'A lentil: a small lens with a soft edge.',
      drum: 'A short cut cylinder with dished ends.',
      pillow: 'A rounded pillow, slightly square.',
      bead: 'A near sphere.',
    }),
    rope: choice('Is there rope fibre with them?', {
      none: 'No, only pellets.',
      strand: 'One frayed strand of blue polypropylene rope, splayed at the ends.',
      tangle: 'A knotted tangle of blue and green fibres.',
      twine: 'A length of orange fishing twine.',
      net: 'A scrap of green trawl netting, a few knotted meshes.',
    }),
    state: choice('What has the sea done to them?', {
      clean: 'Nothing. They look like they were made this morning, which is the trouble.',
      tarred: 'Smeared and spotted with black tar.',
      fouled: 'Colonised: tiny white barnacles and a green film have taken them for stones.',
      bitten: 'Pecked and nibbled, notched round the edge by something that took them for food.',
    }),
    sand: choice('What sand do they lie on?', SANDS),
    confetti: noul('Are there also sharp little fragments of broken coloured plastic scattered through the sand?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    s.root.scale.setScalar(0.03); // one unit is a pellet's radius (about 2.5 mm), shown magnified
    const tints = TINTS[a.colour];
    const palette = SAND_OF[a.sand];
    const reach = a.count === 'one' ? 2.7 : a.count === 'three' ? 3.1 : 3.8;

    const pelletGeometry = (() => {
      if (a.shape === 'drum') {
        const g = new THREE.LatheGeometry([[0.001, -0.3], [0.5, -0.36], [0.72, -0.42], [0.8, -0.34], [0.82, 0.34], [0.72, 0.42], [0.5, 0.36], [0.001, 0.3]].map(([x, y]) => new THREE.Vector2(x, y)), 28);
        return g;
      }
      const g = new THREE.SphereGeometry(1, 28, 18);
      if (a.shape === 'lentil') g.scale(1, 0.46, 1);
      else if (a.shape === 'bead') g.scale(0.82, 0.78, 0.82);
      else {
        // Pillow: push the sphere out towards a rounded square.
        const pos = g.attributes.position as THREE.BufferAttribute;
        for (let i = 0; i < pos.count; i++) {
          const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
          const k = 1 / Math.pow(Math.pow(Math.abs(x), 4) + Math.pow(Math.abs(y), 4) + Math.pow(Math.abs(z), 4), 0.25);
          pos.setXYZ(i, x * k * 0.85, y * k * 0.45, z * k * 0.7);
        }
        g.computeVertexNormals();
      }
      return g;
    })();
    const half = a.shape === 'lentil' ? 0.46 : a.shape === 'bead' ? 0.78 : a.shape === 'drum' ? 0.42 : 0.45;
    const plastic = (hex: string) => {
      const tint = new THREE.Color(hex).lerp(new THREE.Color('#c9b98a'), a.colour === 'black' ? 0 : mood.wear * 0.25);
      return new THREE.MeshStandardMaterial({ color: tint, roughness: mix(0.18, 0.55, mood.wear), transparent: a.colour !== 'black', opacity: a.colour === 'black' ? 1 : 0.93, emissive: tint, emissiveIntensity: mix(0.12, 0.26, mood.cheer) });
    };
    const ball = new THREE.SphereGeometry(1, 10, 8);
    const tar = new THREE.MeshStandardMaterial({ color: '#17150f', roughness: 0.25 });
    const barnacle = new THREE.MeshStandardMaterial({ color: '#efece2', roughness: 0.8 });
    const slime = new THREE.MeshStandardMaterial({ color: '#5f8f3a', roughness: 0.9 });
    const cone = new THREE.CylinderGeometry(0.35, 1, 1, 8);

    const heroes: [number, number][] = a.count === 'one' ? [[0, 0]] : a.count === 'three' ? [[-0.85, 0.3], [0.9, 0.45], [0.1, -0.85]] : [[0, 0.1], [-1.5, 0.7], [1.45, 0.6], [0.5, -1.35], [-1.0, -1.1], [0.2, 1.75], [2.1, -0.9], [-2.3, -0.3]];
    heroes.forEach(([x, z], i) => {
      const pellet = new THREE.Group();
      const body = new THREE.Mesh(pelletGeometry, plastic(tints[i % tints.length]));
      body.castShadow = body.receiveShadow = true;
      pellet.add(body);
      const on = (angle: number, lift: number) => new THREE.Vector3(Math.cos(angle) * Math.sqrt(1 - lift * lift) * 0.8, lift * half, Math.sin(angle) * Math.sqrt(1 - lift * lift) * 0.8);
      const stick = (geometry: THREE.BufferGeometry, material: THREE.Material, p: THREE.Vector3, size: [number, number, number]) => { const m = new THREE.Mesh(geometry, material); m.position.copy(p); m.scale.set(...size); pellet.add(m); return m; };
      // The pip left where the strand was chopped.
      stick(ball, body.material as THREE.Material, new THREE.Vector3(0.1, half * 0.97, 0.05), [0.12, 0.06, 0.12]);
      if (a.state === 'tarred') for (let k = 0; k < 5 + Math.floor(random() * 4); k++) { const size = 0.1 + random() * 0.22; stick(ball, tar, on(random() * 6.283, 0.2 + random() * 0.75), [size, size * 0.4, size]); }
      if (a.state === 'fouled') {
        for (let k = 0; k < 4 + Math.floor(random() * 4); k++) { const size = 0.1 + random() * 0.09; stick(cone, barnacle, on(random() * 6.283, 0.55 + random() * 0.42), [size, size * 1.1, size]).position.y += size * 0.4; }
        for (let k = 0; k < 4; k++) { const size = 0.12 + random() * 0.12; stick(ball, slime, on(random() * 6.283, 0.1 + random() * 0.6), [size, size * 0.25, size]); }
      }
      if (a.state === 'bitten') for (let k = 0; k < 2 + Math.floor(random() * 3); k++) { const angle = random() * 6.283; const notch = stick(ball, new THREE.MeshStandardMaterial({ color: new THREE.Color(tints[i % tints.length]).multiplyScalar(0.45), roughness: 0.9 }), on(angle, 0.25).multiplyScalar(1.16), [0.2, 0.3, 0.12]); notch.rotation.y = -angle + Math.PI / 2; }
      const k = a.count === 'one' ? 1.25 : i === 0 ? 1.05 : 0.8 + random() * 0.2;
      pellet.scale.setScalar(k);
      pellet.rotation.set((random() - 0.5) * 0.5, random() * 6.283, (random() - 0.5) * 0.5);
      pellet.position.set(x + (random() - 0.5) * 0.2, half * k * 0.82 + 0.06, z + (random() - 0.5) * 0.2);
      s.root.add(pellet);
    });

    s.root.add(bed(random, { radius: reach, grain: 0.26, count: 420 + Math.round(mood.density * 380), palette, specks: a.sand === 'volcanic' ? ['#5c7a3a', '#8a8f86'] : SAND.dark, speckShare: 0.07 }));

    if (a.count === 'drift') {
      // The rest of the spill, lying along the line the last tide reached.
      const more: Speck[] = [];
      const n = 26 + Math.round(mood.density * 30);
      for (let i = 0; i < n; i++) {
        const t = random() * 2 - 1, x = t * reach * 0.9, z = Math.sin(t * 2.2) * 0.9 + (random() - 0.5) * 1.6 - 0.2;
        if (Math.hypot(x, z) > reach * 0.93 || heroes.some(([hx, hz]) => Math.hypot(x - hx, z - hz) < 1)) continue;
        more.push({ x, y: 0.12, z, size: 0.42 + random() * 0.12, color: tints[Math.floor(random() * tints.length)], flat: half });
      }
      s.root.add(strew(random, more, ball, new THREE.MeshStandardMaterial({ roughness: 0.3 })));
    }
    if (a.confetti) {
      const bits: Speck[] = [];
      const bright = ['#e04848', '#3f8fe0', '#f2c230', '#3fae6a', '#f4f2ea', '#ef7fb0'];
      for (let i = 0; i < 16 + Math.round(mood.density * 20); i++) { const angle = random() * 6.283, r = Math.sqrt(random()) * reach * 0.9; bits.push({ x: Math.cos(angle) * r, y: 0.14, z: Math.sin(angle) * r, size: 0.14 + random() * 0.14, color: bright[i % bright.length], flat: 0.25 }); }
      s.root.add(strew(random, bits, new THREE.TetrahedronGeometry(1), new THREE.MeshStandardMaterial({ roughness: 0.35, flatShading: true })));
    }

    // Rope: fibres twisted round a wandering path, unravelling at each end.
    if (a.rope !== 'none') {
      const hues = ROPES[a.rope];
      const fibre = (hex: string) => new THREE.MeshStandardMaterial({ color: hex, roughness: 0.45, emissive: hex, emissiveIntensity: 0.18 });
      const lay = (path: THREE.CatmullRomCurve3, strands: number, thick: number, twist: number, fray: number) => {
        for (let k = 0; k < strands; k++) {
          const phase = (k / strands) * 6.283, points: [number, number, number][] = [];
          for (let i = 0; i <= 28; i++) {
            const t = i / 28, p = path.getPointAt(t), tangent = path.getTangentAt(t);
            const side = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();
            const end = Math.max(0, Math.abs(t - 0.5) * 2 - (1 - fray)) / fray;
            const r = thick * 1.1 + end * end * (0.5 + random() * 0.25);
            const angle = t * twist + phase;
            points.push([p.x + side.x * Math.cos(angle) * r, Math.max(thick, p.y + Math.sin(angle) * r + thick), p.z + side.z * Math.cos(angle) * r]);
          }
          s.tube(points, thick, fibre(hues[k % hues.length]));
        }
      };
      const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
      const edge = reach * 0.8;
      if (a.rope === 'strand') lay(new THREE.CatmullRomCurve3([V(-edge, 0.15, 0.9), V(-edge * 0.4, 0.2, 1.7), V(edge * 0.2, 0.45, 1.5), V(edge * 0.85, 0.15, 0.2)]), 4, 0.075, 22, 0.3);
      else if (a.rope === 'twine') lay(new THREE.CatmullRomCurve3([V(-edge * 0.9, 0.12, -0.6), V(-edge * 0.3, 0.2, -1.6), V(edge * 0.3, 0.3, 1.5), V(0.2, 0.6, 1.9), V(-0.7, 0.2, 1.4), V(edge * 0.9, 0.12, 1.2)]), 2, 0.07, 40, 0.12);
      else if (a.rope === 'tangle') {
        const cx = a.count === 'one' ? 1.5 : 0.3, cz = 1.5;
        for (let k = 0; k < 3; k++) {
          const turn = k * 2.1 + random();
          lay(new THREE.CatmullRomCurve3([V(cx + Math.cos(turn) * 1.4, 0.1, cz + Math.sin(turn) * 1.0), V(cx + Math.cos(turn + 1) * 0.5, 0.5, cz + Math.sin(turn + 1) * 0.5), V(cx - Math.cos(turn) * 0.3, 0.7, cz - Math.sin(turn) * 0.3), V(cx + Math.cos(turn + 2.4) * 0.6, 0.35, cz + Math.sin(turn + 2.4) * 0.6), V(cx + Math.cos(turn + 3.4) * 1.5, 0.1, cz + Math.sin(turn + 3.4) * 1.0)]), 2, 0.065, 16, 0.35);
        }
      } else {
        // Netting: a diamond mesh of twisted twine with a knot at every crossing.
        const knot = fibre(hues[0]);
        const node = (i: number, j: number) => V(-1.5 + i * 0.95 + (j % 2) * 0.47 + (random() - 0.5) * 0.12, 0.2 + 0.12 * Math.sin(i * 1.7 + j), 0.6 + j * 0.62 + (random() - 0.5) * 0.1);
        const grid = Array.from({ length: 4 }, (_row, j) => Array.from({ length: 4 }, (_col, i) => node(i, j)));
        grid.forEach((row, j) => row.forEach((p, i) => {
          s.ball([0.14, 0.12, 0.14], [p.x, p.y, p.z], knot, 10);
          const below = grid[j + 1];
          if (!below) { if (random() < 0.7) s.rod([p.x, p.y, p.z], [p.x + (random() - 0.5) * 0.5, 0.1, p.z + 0.5], 0.05, knot, 0.02); return; }
          for (const q of [below[i], below[i + (j % 2 ? 1 : -1)]]) if (q) s.rod([p.x, p.y, p.z], [q.x, q.y, q.z], 0.055, knot);
        }));
      }
    }

    return s.finish({ footprint: reach * 0.03 * 0.75 });
  },
});
