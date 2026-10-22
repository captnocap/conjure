import * as THREE from 'three';
import { Sculpture, choice, score, noul, defineThing } from '@conjure/kit';

export default defineThing({
  questions: {
    basin: choice('What holds the water?', { bowl: 'A low circular stone bowl.', pond: 'An irregular ring of garden stones.', tray: 'A square ceramic water-garden tray.' }),
    size: score('How broad is the water garden?', ['A tabletop bowl', 'A small garden pond', 'A broad courtyard basin']),
    bloom: choice('What colour are the lotus petals?', { pink: 'Soft pink petals with golden hearts.', white: 'White petals with cream centres.', red: 'Deep red petals with ochre hearts.', blue: 'Pale blue water-lily petals.' }),
    opening: choice('How open are the flowers?', { bud: 'Closed pointed buds.', half: 'Partially open cups.', full: 'Fully spread layered blossoms.' }),
    pads: score('How much of the water carries lily pads?', ['A few separate pads', 'A loose quilt of leaves', 'Many overlapping pads']),
    seeds: noul('Does a perforated lotus seed head rise above the leaves?'),
    ripples: noul('Are circular ripples spreading through the open water?'),
    stepping: noul('Is there a flat stepping stone beside the basin?'),
  },
  build(a, context) {
    const s = new Sculpture(context), r = 0.25 + a.size * 1.8, stone = s.material(a.basin === 'tray' ? '#6d9a91' : '#929582'), water = s.material('#a3bab0', { roughness: 0.2 }), green = s.material('#6b8b53'), petal = s.material({ pink: '#d7a0b8', white: '#eee9d5', red: '#b26479', blue: '#a4bddc' }[a.bloom]), heart = s.material('#baae58');
    if (a.basin === 'tray') { s.box([r * 2.1, r * 0.2, r * 1.7], [0, r * 0.1, 0], stone); s.box([r * 1.95, r * 0.02, r * 1.55], [0, r * 0.21, 0], water); }
    else { const b = s.cylinder(r, r * 0.88, r * 0.18, [0, r * 0.09, 0], stone, 32), w = s.cylinder(r * 0.86, r * 0.86, r * 0.02, [0, r * 0.18, 0], water, 48); b.scale.z = w.scale.z = 0.8; if (a.basin === 'pond') for (let i = 0; i < 14; i++) { const t = i * Math.PI / 7; s.ball([r * 0.18, r * 0.09, r * 0.14], [Math.cos(t) * r * 0.95, r * 0.18, Math.sin(t) * r * 0.76], stone, 8); } }
    const level = r * 0.22, count = 4 + Math.round(a.pads * 10);
    for (let i = 0; i < count; i++) { const t = i * 2.4, rr = r * Math.sqrt((i + 1) / count) * 0.66, x = Math.cos(t) * rr, z = Math.sin(t) * rr * 0.8, padR = r * (0.13 + context.random() * 0.05); const shape = new THREE.Shape(); shape.moveTo(0, 0); for (let j = 0; j <= 30; j++) { const angle = 0.23 + j / 30 * (Math.PI * 2 - 0.46); shape.lineTo(Math.cos(angle) * padR, Math.sin(angle) * padR); } shape.lineTo(0, 0); const leaf = s.mesh(new THREE.ShapeGeometry(shape), green, [x, level + i * r * 0.001, z]); leaf.rotation.x = -Math.PI / 2; leaf.rotation.z = t; }
    for (let i = 0; i < 3; i++) { const t = i * 2.2, x = Math.cos(t) * r * 0.38, z = Math.sin(t) * r * 0.24, y = level + r * (0.33 + i * 0.07); s.rod([x, level, z], [x, y, z], r * 0.012, green); if (a.opening === 'bud') s.ball([r * 0.055, r * 0.13, r * 0.055], [x, y, z], petal, 16); else { for (let layer = 0; layer < 3; layer++) for (let j = 0; j < 8; j++) { const angle = j * Math.PI / 4 + layer * 0.38, reach = r * (0.11 - layer * 0.024), p = s.ball([r * 0.046, r * 0.018, r * 0.09], [x + Math.cos(angle) * reach, y + layer * r * 0.032, z + Math.sin(angle) * reach], petal, 12); p.rotation.y = Math.PI / 2 - angle; p.rotation.x = a.opening === 'half' ? -0.55 : -0.15; } s.ball([r * 0.045, r * 0.025, r * 0.045], [x, y + r * 0.08, z], heart, 12); } }
    if (a.seeds) { const x = -r * 0.38, z = r * 0.26, y = level + r * 0.55; s.rod([x, level, z], [x, y, z], r * 0.014, green); s.cylinder(r * 0.085, r * 0.04, r * 0.09, [x, y, z], heart, 14); for (let i = 0; i < 7; i++) { const t = i * 2.4; s.ball([r * 0.012, r * 0.005, r * 0.012], [x + Math.cos(t) * r * 0.05, y + r * 0.047, z + Math.sin(t) * r * 0.05], s.material('#666b3d'), 6); } }
    if (a.ripples) for (let i = 0; i < 3; i++) { const ring = s.ring(r * (0.1 + i * 0.09), r * 0.0025, [r * 0.25, level + r * 0.003, -r * 0.27], s.material('#cfddd3'), Math.PI * 1.7); ring.rotation.x = Math.PI / 2; }
    if (a.stepping) s.ball([r * 0.32, r * 0.07, r * 0.23], [r * 1.2, r * 0.07, 0], stone, 10);
    return s.finish();
  },
});
