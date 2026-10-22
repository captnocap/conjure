import * as THREE from 'three';
import { choice, score, noul, defineWorld, diorama } from '@conjure/kit';

export default defineWorld({
  questions: {
    sky: choice('What sky holds the floating gardens?', { pearl: 'A pale pearl sky.', blush: 'A soft peach and rose sky.', blue: 'An open powder-blue sky.', lavender: 'A quiet lavender sky.' }),
    islands: choice('What surfaces crown the clouds?', { moss: 'Green moss platforms with trailing roots.', marble: 'Pale marble terraces.', lagoon: 'Turquoise shallow island pools.' }),
    cloud: choice('How are the cloud foundations shaped?', { pillows: 'Soft separate cloud pillows.', wave: 'A continuous rolling cloud wave.', towers: 'Small stacked cumulus towers.' }),
    gardens: choice('What grows along the island edges?', { reeds: 'Thin golden reeds.', blossoms: 'Small pink flower clusters.', cypress: 'Slender dark miniature cypress trees.' }),
    cover: score('How much vegetation borders the islands?', ['One or two plants per island', 'A small border garden', 'Lush planted margins']),
    bridges: noul('Do delicate arched bridges link the islands?'),
    cascades: noul('Does water spill in thin suspended waterfalls?'),
    halo: noul('Does a large tilted ring float behind the garden?'),
  },
  build(a, context) {
    const slots = [[0, 1.3], [-3.8, -1.7], [3.8, -1.7], [-3.8, 3.7], [3.8, 3.7], [0, -4]] as const;
    const { art: s, world } = diorama(context, { background: { pearl: '#e0e5df', blush: '#e8d7c8', blue: '#c2d9e3', lavender: '#d5d0e4' }[a.sky], floor: null, width: 16, depth: 12, floating: true, slots, pitch: 24, maxHeight: 2.8, radius: 1.1 });
    const cloud = s.material('#e8e7dc'), soil = s.material({ moss: '#9bac78', marble: '#ced0c2', lagoon: '#8ebfbb' }[a.islands]), stem = s.material('#8a9a68'), root = s.material('#9c8b69'), plantCount = 2 + Math.round(a.cover * 4);
    slots.forEach(([x, z], index) => {
      const y = 1.2 + index % 3 * 0.9;
      for (let i = 0; i < 5; i++) { const t = i * 2.4, extra = a.cloud === 'towers' ? i * 0.18 : 0; s.ball([1.2, 0.32 + extra * 0.35, 1], [x + Math.cos(t) * 0.68, y - 0.5 - extra, z + Math.sin(t) * 0.48], cloud, 16); }
      const platform = s.cylinder(1.55, 1.3, 0.15, [x, y - 0.075, z], soil, 32); platform.scale.z = 0.78;
      if (a.islands === 'moss') for (let i = 0; i < 4; i++) { const t = i * Math.PI / 2; s.tube([[x + Math.cos(t) * 1.1, y - 0.1, z + Math.sin(t) * 0.8], [x + Math.cos(t) * 1.3, y - 0.65, z + Math.sin(t) * 0.85], [x + Math.cos(t) * 1.15, y - 1.1, z + Math.sin(t) * 0.8]], 0.025, root); }
      for (let i = 0; i < plantCount; i++) { const t = i / plantCount * Math.PI * 2 + 0.3, px = x + Math.cos(t) * 1.35, pz = z + Math.sin(t) * 0.96, h = 0.45 + context.random() * 0.4; if (a.gardens === 'cypress') { s.cylinder(0, 0.16, h, [px, y + h / 2, pz], s.material('#6a846c'), 10); } else { s.rod([px, y, pz], [px, y + h, pz], 0.012, stem); if (a.gardens === 'reeds') s.ball([0.035, 0.16, 0.035], [px, y + h, pz], s.material('#c3b477'), 8); else { const pink = s.material('#d6a7b5'); for (let j = 0; j < 5; j++) { const u = j * Math.PI * 2 / 5; s.ball([0.065, 0.026, 0.05], [px + Math.cos(u) * 0.06, y + h, pz + Math.sin(u) * 0.06], pink, 8); } } } }
      if (a.cascades && index % 2 === 0) { const water = s.material('#a8cacc'); s.tube([[x + 1.3, y - 0.04, z], [x + 1.58, y - 0.26, z], [x + 1.65, y - 1.2, z + 0.06]], 0.065, water); }
    });
    if (a.cloud === 'wave') for (let i = 0; i < 9; i++) s.ball([1.35, 0.3, 0.8], [(i - 4) * 1.6, 0.3 + Math.sin(i) * 0.2, -1.6], cloud, 16);
    if (a.bridges) for (const pair of [[0, 1], [0, 2], [1, 5], [2, 5]]) { const [i, j] = pair, p: [number, number, number] = [slots[i][0], 1.2 + i % 3 * 0.9, slots[i][1]], q: [number, number, number] = [slots[j][0], 1.2 + j % 3 * 0.9, slots[j][1]], direction = new THREE.Vector3(...q).sub(new THREE.Vector3(...p)), side = new THREE.Vector3(-direction.z, 0, direction.x).normalize().multiplyScalar(0.23); for (const edge of [-1, 1]) s.tube([[p[0] + side.x * edge, p[1] + 0.12, p[2] + side.z * edge], [(p[0] + q[0]) / 2 + side.x * edge, (p[1] + q[1]) / 2 + 0.5, (p[2] + q[2]) / 2 + side.z * edge], [q[0] + side.x * edge, q[1] + 0.12, q[2] + side.z * edge]], 0.03, soil); for (let k = 0; k < 10; k++) { const f = k / 9, center = new THREE.Vector3(...p).lerp(new THREE.Vector3(...q), f); center.y += Math.sin(f * Math.PI) * 0.5 + 0.12; s.rod([center.x - side.x, center.y, center.z - side.z], [center.x + side.x, center.y, center.z + side.z], 0.04, soil); } }
    if (a.halo) { const ring = s.ring(3.1, 0.06, [0, 4.7, -5.2], s.material('#b6ba9a', { metalness: 0.25 })); ring.rotation.z = 0.3; ring.rotation.y = -0.15; }
    return world;
  },
});
