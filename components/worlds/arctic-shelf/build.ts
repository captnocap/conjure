import * as THREE from 'three';
import { choice, score, noul, defineWorld, diorama } from '@conjure/kit';

export default defineWorld({
  questions: {
    shelf: choice('How is the ice surface arranged?', { solid: 'An unbroken snowy shelf.', fissure: 'A broad blue lead splits the back of the ice.', floes: 'Separate polygonal floes around the margins.' }),
    sky: choice('What surrounds the polar shelf?', { pale: 'Pale overcast polar air.', blue: 'Clear blue polar sky.', rose: 'Soft rose and lavender twilight.' }),
    cliffs: score('How high are the ice formations at the rear?', ['Low broken slabs', 'A fractured ice wall', 'Towering angular icebergs']),
    ridges: score('How pronounced are the wind-carved snow ridges?', ['Smooth snow', 'Shallow parallel ridges', 'Sculpted rolling drifts']),
    sea: choice('What colour appears in open water?', { turquoise: 'Turquoise meltwater.', navy: 'Dark open ocean.', silver: 'Pale reflective slush.' }),
    debris: noul('Are small calved ice blocks scattered along the edge?'),
    cairn: noul('Has a small stone navigation cairn been built on the ice?'),
    aurora: noul('Does a quiet arc of aurora cross the far sky?'),
  },
  build(a, context) {
    const { art: s, world } = diorama(context, { background: { pale: '#dce3de', blue: '#b8d0de', rose: '#d9cad9' }[a.sky], floor: '#d7e1db', width: 18, depth: 13, yaw: 24, pitch: 24, maxHeight: 3.8, radius: 1.8, slots: [[0, 2], [-4, -0.6], [4, -0.6], [-4.8, 3.6], [4.8, 3.6], [0, -2.4]] });
    world.keyLight!.color.set('#dceaf5');
    const ice = s.material('#a9c6d0', { flatShading: true }), white = s.material('#e3e8de'), water = s.material({ turquoise: '#86b4bb', navy: '#658697', silver: '#b9cdcf' }[a.sea], { roughness: 0.22 });
    if (a.shelf !== 'solid') { s.box([18, 0.025, 1.15], [0, 0.02, -4], water); for (let i = 0; i < 9; i++) { const floe = s.cylinder(0.45 + context.random() * 0.35, 0.55, 0.15, [(i - 4) * 2, 0.11, -4.05 + (context.random() - 0.5) * 0.9], white, 5); floe.rotation.y = context.random(); } }
    for (let i = 0; i < 12; i++) { const x = (i - 5.5) * 1.45, h = 0.7 + a.cliffs * (1.4 + context.random() * 3.2); const berg = s.cylinder(0.45, 0.95, h, [x, h / 2, -5.7], ice, 4); berg.rotation.y = context.random() * 1.2; berg.rotation.z = (context.random() - 0.5) * 0.18; s.ball([0.7, 0.16, 0.6], [x, h + 0.02, -5.7], white, 6); }
    for (let i = 0; i < 10; i++) { const x = i % 2 ? -7 : 7, z = (Math.floor(i / 2) - 2) * 2.2; const drift = s.ball([1.4, 0.04 + a.ridges * 0.26, 0.4], [x, 0.04 + a.ridges * 0.12, z], white, 14); drift.rotation.y = -0.4; }
    if (a.shelf === 'floes') for (let i = 0; i < 12; i++) { const side = i % 2 ? -1 : 1; s.box([0.08, 0.02, 1.1], [side * 8.2, 0.025, (i / 12 - 0.5) * 12], water).rotation.y = 0.5; }
    if (a.debris) for (let i = 0; i < 18; i++) { const p = s.box([0.25 + context.random() * 0.3, 0.16, 0.3], [(context.random() - 0.5) * 16, 0.08, -4.9 - context.random() * 0.5], ice); p.rotation.y = context.random() * Math.PI; }
    if (a.cairn) { const rock = s.material('#838e87'); for (let i = 0; i < 5; i++) s.ball([0.36 - i * 0.05, 0.13, 0.27 - i * 0.035], [-6.3, 0.14 + i * 0.23, 2.9], rock, 7); }
    if (a.aurora) { const aurora = s.material('#b3d9c3', { emissive: '#9bbdae', emissiveIntensity: 0.2, side: THREE.DoubleSide }); const pos: number[] = [], indices: number[] = []; for (let i = 0; i < 25; i++) { const x = -9 + i * 0.75, y = 5.7 + Math.sin(i * 0.18) * 0.65; pos.push(x, y, -7, x, y + 0.35 + Math.sin(i * 0.6) * 0.12, -7.08); if (i < 24) { const k = i * 2; indices.push(k, k + 1, k + 2, k + 1, k + 3, k + 2); } } const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(indices); g.computeVertexNormals(); s.mesh(g, aurora).castShadow = false; }
    return world;
  },
});
