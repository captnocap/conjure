import * as THREE from 'three';
import { choice, defineThing, mix, noul, score } from '@conjure/kit';
import { grounded, instances, mat, mesh, noise, paint, range, smooth, type Spot, terrainDisc } from './lib';

const SHAPES = {
  slab: [1, 0.32, 0.72],
  shard: [1, 0.26, 0.3],
  block: [1, 0.78, 0.85],
  lump: [1, 0.7, 0.8],
} as const;

export default defineThing({
  questions: {
    shape: choice('What shape is the fragment?', {
      slab: 'A flat calved slab, layered like a broken paving stone.',
      shard: 'A long tapering shard of ice.',
      block: 'A chunky block with sheared, fresh-cut faces.',
      lump: 'A rounded lump, its edges worn soft.',
    }),
    frost: choice('How does the light find it?', {
      cap: 'A brilliant cap of frost on its sunward face, the rest dark.',
      edges: 'Frost only along its broken edges, like sugar on a crust.',
      dusty: 'No frost at all: dust-dark all over, a hole in the light.',
      glassy: 'A chipped face of clear blue glassy ice.',
    }),
    where: choice('Where is it drifting?', {
      surface: 'Hovering just above the crust, its shadow on the dust below.',
      space: 'Adrift in open space with nothing beneath it.',
      swarm: 'One of many: a loose swarm of smaller fragments drifting with it, like a piece of a ring.',
    }),
    turning: choice('How is it turning?', {
      roll: 'Rolling slowly over and over.',
      tumble: 'Tumbling end over end, awkwardly.',
      twirl: 'Twirling about its long axis like a dropped leaf.',
    }),
    strata: noul('Does it show the dark and pale bands of the cliff it fell from?'),
    shedding: noul('Is it shedding a trail of grains and pebbles?'),
    size: score('How big is it?', ['A boulder', 'A house', 'A hillside block hundreds of metres long']),
  },

  build(a, context) {
    const { mood, random } = context;
    const root = new THREE.Group();
    const n = noise(random);
    const L = mix(4, 160, a.size ** 1.6) * range(random, 0.85, 1.15);
    const [sx, sy, sz] = SHAPES[a.shape];

    // ---- The chunk: a faceted, displaced block painted with strata and frost ----
    const chunkGeometry = (length: number, rough: number, seed: number) => {
      const g = a.shape === 'lump' ? new THREE.IcosahedronGeometry(0.5, 3) : new THREE.BoxGeometry(1, 1, 1, 8, 5, 6);
      g.scale(length * sx, length * sy, length * sz);
      if (a.shape === 'shard') {
        // Taper toward one end.
        const p = g.attributes.position;
        // Taper to a blade: thin to a point at one end, a broken stub at the other.
        for (let i = 0; i < p.count; i++) { const t = p.getX(i) / (length * sx) + 0.5; p.setY(i, p.getY(i) * (1 - t * 0.55)); p.setZ(i, p.getZ(i) * (1 - t * 0.9)); }
      }
      const p = g.attributes.position, v = new THREE.Vector3();
      for (let i = 0; i < p.count; i++) {
        v.fromBufferAttribute(p, i);
        const d = n(v.x / length + seed, v.y / length, v.z / length, 2.2) * rough + n(v.z / length, v.x / length + seed, v.y / length, 6) * rough * 0.35;
        const len = v.length() || 1;
        v.addScaledVector(v.clone().divideScalar(len), d * length);
        p.setXYZ(i, v.x, v.y, v.z);
      }
      // Two sheared cuts give fresh flat faces.
      if (a.shape === 'block' || a.shape === 'slab') {
        const cut = new THREE.Vector3(range(random, -1, 1), range(random, 0.2, 1), range(random, -1, 1)).normalize();
        const limit = length * sy * 0.32;
        for (let i = 0; i < p.count; i++) {
          v.fromBufferAttribute(p, i);
          const over = v.dot(cut) - limit;
          if (over > 0) v.addScaledVector(cut, -over);
          p.setXYZ(i, v.x, v.y, v.z);
        }
      }
      g.computeVertexNormals();
      return g;
    };
    // Decide how the chunk hangs first, so its frost faces the sun and its glassy face faces us.
    const turn = new THREE.Euler(range(random, -0.4, 0.4), random() * Math.PI * 2, range(random, -0.3, 0.3));
    const inverse = new THREE.Quaternion().setFromEuler(turn).invert();
    const sun = new THREE.Vector3(-0.4, 0.85, 0.35).normalize().applyQuaternion(inverse);
    const toward = new THREE.Vector3(0.35, 0.3, 0.9).normalize().applyQuaternion(inverse);
    const dark = new THREE.Color('#36302b').lerp(new THREE.Color('#544a40'), mood.wear * 0.6), mid = new THREE.Color('#6d655c'), frost = new THREE.Color('#f2f6f7'), blue = new THREE.Color('#9fd0e8');
    const paintChunk = (g: THREE.BufferGeometry, length: number) => {
      const normal = g.attributes.normal, nn = new THREE.Vector3();
      paint(g, (p, c, i) => {
        nn.fromBufferAttribute(normal, i);
        c.copy(dark).lerp(mid, Math.max(0, n(p.x / length, p.y / length, p.z / length, 3)) * 0.6);
        if (a.strata) {
          const band = Math.sin((p.y / length) * 38 + n(p.x / length, p.z / length, 0, 2) * 2.5);
          c.lerp(band > 0.55 ? new THREE.Color('#b8bdbd') : new THREE.Color('#2a2521'), Math.abs(band) > 0.55 ? 0.55 : 0);
        }
        const facing = nn.dot(sun);
        if (a.frost === 'cap') c.lerp(frost, smooth(0.35, 0.75, facing) * 0.95);
        if (a.frost === 'edges') {
          const ex = Math.abs(p.x) / (length * sx * 0.5), ey = Math.abs(p.y) / (length * sy * 0.5), ez = Math.abs(p.z) / (length * sz * 0.5);
          const near = [ex, ey, ez].filter((e) => e > 0.78).length;
          c.lerp(frost, near >= 2 ? 0.9 : smooth(0.6, 1, Math.max(ex, ey, ez)) * smooth(0.2, 0.6, n(p.x / length, p.y / length, p.z / length, 5)) * 0.6);
        }
        if (a.frost === 'glassy') c.lerp(blue, smooth(0.35, 0.75, nn.dot(toward)) * 0.95);
        if (a.frost === 'dusty') c.multiplyScalar(0.8);
      });
    };
    const ice = mat('#ffffff', { vertexColors: true, flatShading: true, roughness: a.frost === 'glassy' ? 0.3 : 0.85, metalness: 0 });
    const main = chunkGeometry(L, a.shape === 'lump' ? 0.09 : 0.06, 0);
    paintChunk(main, L);
    main.computeBoundingSphere();
    const R = main.boundingSphere!.radius;
    const pivot = new THREE.Group();
    root.add(pivot);
    const chunk = mesh(pivot, main, ice);
    chunk.rotation.copy(turn);
    const hover = a.where === 'surface' ? R * range(random, 1.15, 1.4) : R;
    pivot.position.y = hover;

    // ---- Companions in a swarm ----
    const drifters: { mesh: THREE.Mesh; axis: THREE.Vector3; speed: number; orbit: number; angle: number; y: number; around: number }[] = [];
    if (a.where === 'swarm') {
      const count = Math.round(mix(5, 14, mood.density));
      for (let i = 0; i < count; i++) {
        const size = L * range(random, 0.12, 0.4);
        const g = chunkGeometry(size, 0.08, i + 1);
        paintChunk(g, size);
        const piece = mesh(root, g, ice);
        const orbit = range(random, 1.3, 3.2) * R, angle = random() * Math.PI * 2;
        drifters.push({ mesh: piece, axis: new THREE.Vector3(random() - 0.5, random() - 0.5, random() - 0.5).normalize(), speed: range(random, 0.3, 1.2), orbit, angle, y: hover + range(random, -0.5, 0.5) * R, around: range(random, 0.02, 0.06) });
      }
    }

    // ---- The crust beneath, with the chunk's shadow and a ring of stirred dust ----
    let ground: THREE.Mesh | null = null;
    if (a.where === 'surface') {
      const radius = R * 1.9;
      const g = terrainDisc(16, 56, (angle) => radius * (1 + n(Math.cos(angle), Math.sin(angle), 0, 0.8) * 0.12), (x, z, t) =>
        (n(x / R, 0, z / R, 0.7) * R * 0.05 + R * 0.04) * (1 - smooth(0.8, 1, t)) - smooth(0.92, 1, t) * R * 0.02);
      paint(g, (p, c) => {
        const d = Math.hypot(p.x + R * 0.25, p.z - R * 0.12) / R;
        c.set('#3d3732').lerp(new THREE.Color('#6a6056'), Math.max(0, n(p.x / R, p.z / R, 0, 1.4)) * 0.5);
        c.lerp(new THREE.Color('#1a1715'), (1 - smooth(0.3, 0.95, d)) * 0.75);
        c.lerp(new THREE.Color('#857a6d'), Math.exp(-((d - 1.35) ** 2) / 0.04) * 0.5);
      });
      ground = mesh(root, g, mat('#ffffff', { vertexColors: true, flatShading: true, roughness: 1 }));
      const pebbles: Spot[] = Array.from({ length: 40 }, () => {
        const r = Math.sqrt(random()) * radius * 0.85, t = random() * Math.PI * 2, s = R * range(random, 0.015, 0.06);
        return { at: [Math.cos(t) * r, R * 0.04 + s * 0.3, Math.sin(t) * r], scale: s, rot: [random() * 3, random() * 3, random() * 3] };
      });
      instances(root, new THREE.DodecahedronGeometry(1, 0), mat('#4a433d', { flatShading: true }), pebbles);
    }

    // ---- A trail of grains peeling away from it ----
    const grains: { at: THREE.Vector3; v: THREE.Vector3; life: number }[] = [];
    let grainMesh: THREE.InstancedMesh | null = null;
    if (a.shedding) {
      const count = 46;
      grainMesh = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(1, 0), mat('#5e564e', { flatShading: true }), count);
      grainMesh.castShadow = true;
      grainMesh.frustumCulled = false;
      for (let i = 0; i < count; i++) grains.push({ at: new THREE.Vector3(), v: new THREE.Vector3(range(random, 0.2, 1), range(random, -0.3, 0.15) * (a.where === 'surface' ? 1 : 0.5), range(random, -0.4, 0.4)).normalize(), life: random() });
      root.add(grainMesh);
    }

    // ---- Motion ----
    const pace = mix(0.05, 0.6, mood.energy);
    const spinAxis = { roll: new THREE.Vector3(0, 0, 1), tumble: new THREE.Vector3(1, 0, 0.3).normalize(), twirl: new THREE.Vector3(1, 0, 0) }[a.turning];
    const spinRate = { roll: 0.5, tumble: 0.8, twirl: 1.6 }[a.turning];
    const matrix = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3();
    const lay = (time: number) => {
      for (const d of drifters) {
        const ang = d.angle + time * pace * d.around;
        d.mesh.position.set(Math.cos(ang) * d.orbit, d.y + Math.sin(time * pace * 0.6 + d.angle) * R * 0.08, Math.sin(ang) * d.orbit * 0.55);
        d.mesh.setRotationFromAxisAngle(d.axis, time * pace * d.speed + d.angle);
      }
      if (grainMesh) {
        grains.forEach((g, i) => {
          const t = (g.life + time * pace * 0.25) % 1;
          g.at.copy(g.v).multiplyScalar(R * (0.7 + t * 2.4)).setY(hover + g.v.y * R * (0.5 + t * 2) - (a.where === 'surface' ? t * t * hover * 0.8 : 0));
          const s = R * 0.03 * (1 - t * 0.6);
          grainMesh!.setMatrixAt(i, matrix.compose(g.at, q.identity(), sc.set(s, s, s)));
        });
        grainMesh.instanceMatrix.needsUpdate = true;
      }
    };
    lay(0);
    const update = (dt: number, time: number) => {
      pivot.rotateOnAxis(spinAxis, dt * pace * spinRate * 0.4);
      pivot.position.y = hover + Math.sin(time * pace * 1.3) * R * 0.04;
      lay(time);
    };
    if (grainMesh) grainMesh.computeBoundingBox();
    return grounded(root, { measure: ground ?? undefined, lift: !ground, update, footprint: R * (a.where === 'swarm' ? 1.6 : 1) });
  },
});
