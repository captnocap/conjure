import * as THREE from 'three';
import { choice, score, noul, defineWorld, diorama } from '@conjure/kit';

export default defineWorld({
  questions: {
    water: choice('What kind of water surrounds the clearing?', { blue: 'Clear blue offshore water.', green: 'Green coastal water.', pearl: 'Pale silvery shallow water.' }),
    floor: choice('What forms the seabed?', { sand: 'A rippled sand bed.', rubble: 'Scattered pale reef stones.', canyon: 'Rocky shoulders around a sandy passage.' }),
    canopy: score('How tall are the surrounding kelp columns?', ['Low waving blades', 'Tall overhead kelp', 'An enclosed submarine forest']),
    stalks: score('How much kelp surrounds the clearing?', ['A few boundary stalks', 'A full perimeter grove', 'Dense overlapping edges']),
    current: choice('How does the underwater current bend the kelp?', { still: 'Upright with slight curls.', left: 'All fronds bow gently left.', spiral: 'Fronds twist in alternating directions.' }),
    shafts: noul('Are pale shafts of light visible through the canopy?'),
    ruin: noul('Does a half-buried stone arch suggest a submerged ruin?'),
    bubbles: noul('Do small bubble chains rise near the margins?'),
  },
  build(a, context) {
    const colors = { blue: '#94b8c7', green: '#abc3b0', pearl: '#cddbd7' }, { art: s, world } = diorama(context, { background: colors[a.water], floor: '#bbbea4', width: 16, depth: 12, pitch: 24, maxHeight: 4.1, radius: 1.65, slots: [[0, 1.2], [-3.2, -1.5], [3.2, -1.5], [-3.7, 3.5], [3.7, 3.5], [0, -3]] });
    world.keyLight!.color.set(a.water === 'green' ? '#c8e3c9' : '#d0e9ec');
    const kelp = s.material('#819358', { side: THREE.DoubleSide }), stem = s.material('#84906a'), rock = s.material('#969b8b', { flatShading: true }), count = 8 + Math.round(a.stalks * 14), h = 4 + a.canopy * 4;
    for (let i = 0; i < count; i++) {
      const side = i % 3, x = side === 0 ? -7 + context.random() * 0.8 : side === 1 ? 7 - context.random() * 0.8 : (context.random() - 0.5) * 13, z = side === 2 ? -5 + context.random() * 0.8 : (context.random() - 0.5) * 10, height = h * (0.68 + context.random() * 0.32), bend = a.current === 'left' ? -1.2 : a.current === 'spiral' ? (i % 2 ? 1 : -1) * 1.1 : 0.3;
      s.ball([0.45, 0.16, 0.34], [x, 0.09, z], rock, 7);
      const path: [number, number, number][] = []; for (let j = 0; j < 9; j++) { const f = j / 8; path.push([x + bend * f * f, f * height, z + Math.sin(f * 4 + i) * 0.25]); } s.tube(path, 0.035, stem);
      for (let blade = 2; blade < 8; blade++) {
        const p = path[blade], direction = blade % 2 ? -1 : 1, positions: number[] = [], indices: number[] = [];
        for (let j = 0; j <= 8; j++) { const f = j / 8, dx = direction * f * 1.2, yy = p[1] + Math.sin(f * Math.PI) * 0.45 - f * 0.18, width = Math.sin(f * Math.PI) * 0.2; positions.push(p[0] + dx, yy - width, p[2] + f * 0.2, p[0] + dx, yy + width, p[2] - f * 0.2); if (j < 8) { const k = j * 2; indices.push(k, k + 1, k + 2, k + 1, k + 3, k + 2); } }
        const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3)); g.setIndex(indices); g.computeVertexNormals(); s.mesh(g, kelp); s.ball([0.075, 0.11, 0.075], p, stem, 8);
      }
    }
    if (a.floor === 'sand') for (let i = 0; i < 13; i++) s.tube([[-7.5, 0.015, i * 0.85 - 5], [0, 0.025, i * 0.85 - 5.15], [7.5, 0.015, i * 0.85 - 5]], 0.018, s.material('#cfd0b7'));
    else for (let i = 0; i < 16; i++) { const side = i % 2 ? -1 : 1; s.ball([0.35 + context.random() * 0.5, a.floor === 'canyon' ? 0.9 : 0.15, 0.4], [side * (5.7 + context.random()), a.floor === 'canyon' ? 0.55 : 0.08, (context.random() - 0.5) * 10], rock, 6); }
    if (a.ruin) { const arch = s.ring(1.3, 0.25, [0, 0.15, -4.8], s.material('#a7b4a2'), Math.PI); arch.scale.y = 1.1; for (const side of [-1, 1]) s.cylinder(0.26, 0.33, 1.2, [side * 1.3, 0.6, -4.8], rock, 8); }
    if (a.shafts) { const beam = s.material('#e8edd3', { transparent: true, opacity: 0.14, depthWrite: false }); for (let i = 0; i < 3; i++) { const shaft = s.cylinder(0.12, 0.75, h, [(i - 1) * 4, h / 2, -3.8], beam, 12); shaft.rotation.z = 0.15; shaft.castShadow = false; } }
    if (a.bubbles) { const points: { at: [number, number, number]; size: number }[] = []; for (let i = 0; i < 45; i++) points.push({ at: [(i % 3 - 1) * 6 + Math.sin(i) * 0.18, i / 45 * h, -4.5 + Math.cos(i) * 0.14], size: 0.025 + context.random() * 0.035 }); s.scatter(new THREE.IcosahedronGeometry(1, 1), s.material('#d8e3dd', { roughness: 0.2 }), points); }
    return world;
  },
});
