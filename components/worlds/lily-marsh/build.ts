import * as THREE from 'three';
import { choice, score, noul, defineWorld, diorama } from '@conjure/kit';

export default defineWorld({
  questions: {
    water: choice('What tone has the marsh water?', { jade: 'Quiet jade-green water.', blue: 'Pale blue reflective water.', silver: 'Silvery grey water.' }),
    banks: choice('What encloses the wetland clearing?', { reeds: 'Tall cattail reeds.', willow: 'Low willow branches and reeds.', stones: 'Rounded shoreline rocks.' }),
    pads: score('How closely do lily pads gather at the margins?', ['A few floating leaves', 'Small rafts of lily pads', 'A broad quilt of overlapping leaves']),
    flowers: choice('What blossoms float among them?', { pink: 'Pale pink lotus blossoms.', white: 'White water lilies.', yellow: 'Small yellow pond flowers.', none: 'Only leaves and reeds.' }),
    crossing: choice('How is the water crossed?', { none: 'The water is uninterrupted.', boards: 'A low boardwalk along one edge.', stones: 'A curve of flat stepping stones.' }),
    ripples: noul('Do circular ripples cross the open clearing?'),
    reedheads: noul('Are dark seed heads visible above the reeds?'),
    islets: noul('Do small moss islets rise at two side slots?'),
  },
  build(a, context) {
    const { art: s, world } = diorama(context, { background: '#cfddd1', floor: { jade: '#9bbbab', blue: '#a2c2cc', silver: '#bdceca' }[a.water], width: 16, depth: 12, yaw: 22, pitch: 29, maxHeight: 2.9, radius: 1.4, slots: [[0, 1.4], [-3.2, -1.6], [3.2, -1.6], [-3.6, 3.5], [3.6, 3.5], [0, -3.3]] });
    const green = s.material('#8ba26a'), stem = s.material('#879870'), rock = s.material('#afb8a6', { flatShading: true }), wood = s.material('#ad9a77'), pad = s.material('#9cae78', { side: THREE.DoubleSide });
    for (let i = 0; i < 28; i++) {
      const t = i * 2.4, x = Math.cos(t) * (6.4 + context.random() * 0.8), z = Math.sin(t) * (4.6 + context.random() * 0.4);
      if (a.banks === 'stones' && i % 2 === 0) s.ball([0.55, 0.25, 0.4], [x, 0.16, z], rock, 8);
      else { const h = 1.6 + context.random() * 1.6; s.tube([[x, 0, z], [x + 0.09, h * 0.55, z], [x + 0.18, h, z]], 0.018, stem); const leaf = s.ball([0.055, h * 0.35, 0.018], [x + 0.15, h * 0.45, z + 0.07], green, 10); leaf.rotation.z = -0.16; if (a.reedheads && i % 2 === 0) s.ball([0.055, 0.22, 0.055], [x + 0.18, h, z], s.material('#a18b65'), 8); }
    }
    if (a.banks === 'willow') for (const side of [-1, 1]) { const x = side * 6, bark = s.material('#9a9275'); s.tube([[x, 0, -3], [x - side * 0.3, 2.4, -3.2], [x - side * 1.4, 3.2, -3.5]], 0.08, bark); for (let i = 0; i < 7; i++) { const xx = x - side * (0.6 + i * 0.16); s.tube([[xx, 3.1, -3.3], [xx + side * 0.06, 2, -3.3], [xx + side * 0.15, 1.3, -3.2]], 0.018, stem); for (let j = 0; j < 4; j++) s.ball([0.04, 0.12, 0.02], [xx, 2.9 - j * 0.38, -3.22], green, 8); } }
    const count = 8 + Math.round(a.pads * 20);
    for (let i = 0; i < count; i++) { const t = i * 2.4, x = Math.cos(t) * (4.5 + context.random() * 1.8), z = Math.sin(t) * (3.4 + context.random() * 1.2), r = 0.3 + context.random() * 0.24, shape = new THREE.Shape(); shape.moveTo(0, 0); for (let j = 0; j <= 30; j++) { const angle = 0.18 + j / 30 * (Math.PI * 2 - 0.36); shape.lineTo(Math.cos(angle) * r, Math.sin(angle) * r); } shape.closePath(); const leaf = s.mesh(new THREE.ShapeGeometry(shape), pad, [x, 0.025, z]); leaf.rotation.x = -Math.PI / 2; leaf.rotation.z = t; if (a.flowers !== 'none' && i % 6 === 0) { const blossom = s.material({ pink: '#d8b1c1', white: '#e6e3ce', yellow: '#cfbe76' }[a.flowers]); for (let j = 0; j < 8; j++) { const u = j * Math.PI / 4, petal = s.ball([0.16, 0.032, 0.065], [x + Math.cos(u) * 0.14, 0.09, z + Math.sin(u) * 0.14], blossom, 10); petal.rotation.y = -u; } s.ball([0.06, 0.035, 0.06], [x, 0.12, z], s.material('#c1b578'), 10); } }
    if (a.crossing === 'boards') { for (let i = 0; i < 15; i++) s.box([1.1, 0.07, 0.55], [-6.3, 0.14, (i - 7) * 0.65], wood); for (const z of [-4, 0, 4]) s.cylinder(0.07, 0.09, 0.9, [-6.8, 0.35, z], wood, 8); }
    if (a.crossing === 'stones') for (let i = 0; i < 10; i++) s.ball([0.45, 0.075, 0.35], [Math.sin(i * 0.25) * 1.4 - 6, 0.05, (i - 4.5) * 0.85], rock, 8);
    if (a.ripples) for (let i = 0; i < 4; i++) { const ring = s.ring(0.55 + i * 0.48, 0.008, [2.1, 0.03, 1.2], s.material('#d2ddd1'), Math.PI * 1.75); ring.rotation.x = Math.PI / 2; }
    if (a.islets) for (const side of [-1, 1]) s.ball([1.2, 0.055, 0.8], [side * 3.2, 0.005, -1.6], green, 16);
    return world;
  },
});
