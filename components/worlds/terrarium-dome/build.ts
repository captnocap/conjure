import * as THREE from 'three';
import { choice, score, noul, defineWorld, diorama } from '@conjure/kit';

export default defineWorld({
  questions: {
    dome: choice('What structure encloses the miniature world?', { bell: 'A rounded glass bell with thin ribs.', facets: 'A polygonal brass-framed case.', jar: 'A tall cylindrical glass jar outline.' }),
    floor: choice('What surface covers the ground?', { moss: 'Green moss and pale stones.', sand: 'Sand and dry-garden gravel.', soil: 'Dark rich soil and leaf litter.' }),
    plants: choice('What plants fill the dome margins?', { fern: 'Broad miniature fern fronds.', succulent: 'Thick succulent rosettes.', shoots: 'Long simple leaves and shoots.' }),
    relief: score('How pronounced are the landscape hummocks?', ['A flat miniature garden', 'Small rolling hummocks', 'Distinct side hills']),
    path: choice('What route passes through the enclosure?', { stones: 'A curve of pale stepping stones.', gravel: 'A narrow gravel path.', none: 'No constructed path.' }),
    layers: noul('Are alternating sand and soil strata visible at the front edge?'),
    condensation: noul('Do condensation beads cling to the dome ribs?'),
    cork: noul('Is a small cork stopper seated at the top?'),
  },
  build(a, context) {
    const { art: s, world } = diorama(context, { background: '#e0e4d7', floor: { moss: '#97a67f', sand: '#c2b895', soil: '#a19176' }[a.floor], width: 14, depth: 11, yaw: 22, pitch: 25, maxHeight: 3.2, radius: 1.4, slots: [[0, 1.6], [-3, -1.7], [3, -1.7], [-3.4, 3.4], [3.4, 3.4], [0, -3.4]] });
    const brass = s.material('#b0a78c', { metalness: 0.22 }), glass = s.material('#bed1c7', { transparent: true, opacity: 0.1, depthWrite: false, side: THREE.DoubleSide, roughness: 0.18 }), green = s.material('#86a16f'), rock = s.material('#bbc0a8', { flatShading: true });
    if (a.dome === 'bell') { const shell = s.mesh(new THREE.SphereGeometry(7.7, 32, 20, Math.PI, Math.PI, 0, Math.PI / 2), glass); shell.scale.z = 0.75; shell.castShadow = false; for (let i = 0; i < 7; i++) { const t = Math.PI + i * Math.PI / 6, pts: [number, number, number][] = []; for (let j = 0; j < 17; j++) { const v = j / 16 * Math.PI / 2; pts.push([Math.cos(t) * Math.sin(v) * 7.7, Math.cos(v) * 7.7, Math.sin(t) * Math.sin(v) * 5.78]); } s.tube(pts, 0.025, brass); } }
    else if (a.dome === 'jar') { for (const x of [-7, 7]) s.rod([x, 0, 0], [x, 7.6, 0], 0.035, brass); for (const y of [0.1, 7.6]) { const rim = s.ring(7, 0.04, [0, y, 0], brass); rim.rotation.x = Math.PI / 2; rim.scale.y = 0.78; } const shell = s.mesh(new THREE.CylinderGeometry(7, 7, 7.6, 32, 1, true, Math.PI / 2, Math.PI), glass, [0, 3.8, 0]); shell.scale.z = 0.78; shell.castShadow = false; }
    else for (let i = 0; i < 8; i++) { const t = i * Math.PI / 4, next = (i + 1) * Math.PI / 4, x = Math.cos(t) * 7.5, z = Math.sin(t) * 5.8, upper: [number, number, number] = [x * 0.6, 7.3, z * 0.6]; s.rod([x, 0, z], [x, 4.5, z], 0.035, brass); s.rod([x, 4.5, z], upper, 0.035, brass); s.rod([x, 4.5, z], [Math.cos(next) * 7.5, 4.5, Math.sin(next) * 5.8], 0.035, brass); s.rod(upper, [Math.cos(next) * 4.5, 7.3, Math.sin(next) * 3.48], 0.035, brass); }
    for (let i = 0; i < 10; i++) { const side = i % 2 ? -1 : 1, x = side * (5.3 + context.random() * 0.5), z = (context.random() - 0.5) * 9, h = 0.08 + a.relief * (0.15 + context.random() * 0.2); s.ball([0.9, h, 0.8], [x, h * 0.55, z], a.floor === 'sand' ? rock : green, 12);
      if (a.plants === 'succulent') for (let j = 0; j < 9; j++) { const t = j * Math.PI * 2 / 9, leaf = s.ball([0.45, 0.07, 0.12], [x + Math.cos(t) * 0.35, h + 0.18, z + Math.sin(t) * 0.35], green, 10); leaf.rotation.y = -t; leaf.rotation.z = 0.3; }
      else { const height = 1.4 + context.random() * 1.1; s.rod([x, h, z], [x, h + height, z], 0.035, green); for (let j = 0; j < (a.plants === 'fern' ? 6 : 3); j++) for (const side of [-1, 1]) { const y = h + height * (0.2 + j / 7 * 0.75), len = 0.7 * (1 - j * 0.09), leaf = s.ball([len, 0.025, a.plants === 'fern' ? 0.12 : 0.22], [x + side * len * 0.65, y, z], green, 12); leaf.rotation.z = side * (a.plants === 'fern' ? 0.1 : 0.4); } }
    }
    if (a.path !== 'none') for (let i = 0; i < 13; i++) s.ball([a.path === 'stones' ? 0.36 : 0.55, 0.022, a.path === 'stones' ? 0.28 : 0.6], [Math.sin(i * 0.4) * 0.7, 0.021, (i - 6) * 0.7], a.path === 'stones' ? rock : s.material('#c5ba95'), 10);
    if (a.layers) for (let i = 0; i < 4; i++) s.box([14, 0.065, 0.04], [0, -0.2 + i * 0.055, 5.5], s.material(i % 2 ? '#b4a186' : '#c9bc9b'));
    if (a.condensation) for (let i = 0; i < 30; i++) { const t = Math.PI + context.random() * Math.PI, v = 0.2 + context.random() * 1.1; s.ball([0.03, 0.05, 0.03], [Math.cos(t) * Math.sin(v) * 7.68, Math.cos(v) * 7.7, Math.sin(t) * Math.sin(v) * 5.75], brass, 8); }
    if (a.cork) s.cylinder(0.42, 0.4, 0.17, [0, 7.7, 0], s.material('#b4a07a'), 24);
    return world;
  },
});
