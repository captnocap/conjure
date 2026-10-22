import * as THREE from 'three';
import { choice, score, noul, defineWorld, diorama } from '@conjure/kit';

export default defineWorld({
  questions: {
    bed: choice('What surface is seen at insect scale?', { leaf: 'A broad green leaf with raised veins.', soil: 'Fine brown soil and seed husks.', moss: 'A soft carpet of tiny moss cushions.' }),
    shelter: choice('What vegetation shelters the scene?', { grass: 'Tall arching grass blades.', clover: 'Broad three-part clover leaves.', flower: 'A large daisy and several leaves.' }),
    canopy: score('How enclosed is the small garden?', ['An open leaf margin', 'A few overhead leaves', 'An intimate leafy shelter']),
    droplets: score('How many dew drops cling to the plants?', ['One or two large droplets', 'Pearls along the leaf margins', 'Many beads of dew']),
    dew: choice('What tone have the droplets?', { clear: 'Pale silver and blue.', amber: 'Warm honey highlights.', violet: 'Soft lilac reflections.' }),
    web: noul('Does a fine spiderweb span two grass blades?'),
    seeds: noul('Are fallen seed husks scattered around the clearing?'),
    buds: noul('Are unopened flower buds visible near the edge?'),
  },
  build(a, context) {
    const { art: s, world } = diorama(context, { background: '#e1e7cc', floor: { leaf: '#9caf73', soil: '#a1916f', moss: '#93a46b' }[a.bed], width: 12, depth: 10, yaw: 20, pitch: 28, maxHeight: 2.7, radius: 1.2, slots: [[0, 1.5], [-2.8, -1.4], [2.8, -1.4], [-3, 3], [3, 3], [0, -3]] });
    const green = s.material('#87a468'), dark = s.material('#66844f'), droplet = s.material({ clear: '#c8dcda', amber: '#dbd4b2', violet: '#c9c7dd' }[a.dew], { roughness: 0.18, metalness: 0.16 }), count = 5 + Math.round(a.canopy * 7);
    if (a.bed === 'leaf') { s.rod([-5.7, 0.018, -4], [5.7, 0.018, 4], 0.025, dark); for (let i = -4; i <= 4; i++) for (const side of [-1, 1]) s.tube([[i * 1.1, 0.016, i * 0.7], [i * 1.1 + side * 0.8, 0.019, i * 0.7 - side * 1.5], [i * 1.1 + side * 1.5, 0.014, i * 0.7 - side * 2.4]], 0.016, green); }
    if (a.bed === 'moss') for (let i = 0; i < 18; i++) { const t = i * 2.4; s.ball([0.52, 0.12, 0.44], [Math.cos(t) * 5.2, 0.07, Math.sin(t) * 4.2], green, 8); }
    const attachment: [number, number, number][] = [];
    for (let i = 0; i < count; i++) {
      const side = i % 2 ? -1 : 1, x = side * (4.7 + context.random() * 0.55), z = (context.random() - 0.5) * 8, h = 3.1 + context.random() * 2.4, lean = -side * (0.5 + context.random() * 0.75);
      if (a.shelter === 'grass') { const pos: number[] = [], idx: number[] = []; for (let j = 0; j < 10; j++) { const f = j / 9, width = Math.sin(f * Math.PI) * 0.16 + 0.02, xx = x + lean * f * f, yy = h * f, zz = z + Math.sin(f * 3) * 0.35; pos.push(xx - width, yy, zz, xx + width, yy, zz); if (j < 9) { const k = j * 2; idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2); } } const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals(); const m = green.clone(); m.side = THREE.DoubleSide; s.mesh(g, m); attachment.push([x + lean * 0.65, h * 0.8, z + 0.2]); }
      else { const y = h * 0.65; s.tube([[x, 0, z], [x + lean * 0.4, y * 0.7, z], [x + lean, y, z]], 0.06, dark); for (let j = 0; j < (a.shelter === 'clover' ? 3 : 1); j++) { const t = j * Math.PI * 2 / 3, leaf = s.ball([0.75, 0.055, 0.5], [x + lean + Math.cos(t) * 0.45, y, z + Math.sin(t) * 0.45], green, 16); leaf.rotation.y = t; leaf.rotation.z = side * 0.15; } attachment.push([x + lean, y + 0.09, z]); }
      if (a.buds && i % 3 === 0) s.ball([0.18, 0.34, 0.18], [x + lean, h * 0.73, z], s.material('#b7b476'), 12);
    }
    if (a.shelter === 'flower') { const x = -3.3, y = 4.6, z = -3.4; s.tube([[x, 0, z], [x + 0.2, 2.8, z], [x, y, z]], 0.09, dark); const petal = s.material('#ece7cb'); for (let i = 0; i < 12; i++) { const t = i * Math.PI / 6; const p = s.ball([0.65, 0.055, 0.2], [x + Math.cos(t) * 0.55, y, z + Math.sin(t) * 0.55], petal, 12); p.rotation.y = -t; } s.ball([0.33, 0.13, 0.33], [x, y + 0.08, z], s.material('#c7b36a'), 14); }
    const dewCount = 2 + Math.round(a.droplets * 14); for (let i = 0; i < dewCount; i++) { const p = attachment[i % attachment.length], size = 0.12 + context.random() * 0.14; s.ball([size, size * 0.83, size], [p[0] + (context.random() - 0.5) * 0.6, p[1] + size * 0.8, p[2] + (context.random() - 0.5) * 0.3], droplet, 16); }
    if (a.web) { const thread = s.material('#ced3bb'), center: [number, number, number] = [0, 3.5, -4.4]; for (let i = 0; i < 10; i++) { const t = i * Math.PI / 5; s.rod(center, [Math.cos(t) * 2.4, 3.5 + Math.sin(t) * 1.55, -4.4], 0.008, thread); } for (let r = 1; r <= 5; r++) { const pts: [number, number, number][] = []; for (let j = 0; j < 10; j++) { const t = j * Math.PI / 5; pts.push([Math.cos(t) * r * 0.45, 3.5 + Math.sin(t) * r * 0.29, -4.4]); } s.tube(pts, 0.007, thread, true); } }
    if (a.seeds) for (let i = 0; i < 12; i++) { const t = i * 2.4; const seed = s.ball([0.12, 0.065, 0.3], [Math.cos(t) * 4.7, 0.055, Math.sin(t) * 3.9], s.material('#baa77b'), 8); seed.rotation.y = t; }
    return world;
  },
});
