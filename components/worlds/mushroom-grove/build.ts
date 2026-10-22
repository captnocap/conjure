import * as THREE from 'three';
import { choice, score, noul, defineWorld, diorama } from '@conjure/kit';

export default defineWorld({
  questions: {
    canopy: choice('What fungal canopy surrounds the clearing?', { umbrella: 'Wide scarlet umbrellas.', lantern: 'Tall ochre bell caps.', shelves: 'Layered violet shelf fungi.' }),
    scale: score('How tall are the enclosing mushrooms relative to the clearing?', ['Small surrounding caps', 'Overhead umbrellas', 'Towering fungal trees']),
    floor: choice('What forms the forest-floor carpet?', { moss: 'Soft green moss.', leaves: 'Rust-coloured leaf litter.', bark: 'Dark bark and pale lichen.' }),
    path: choice('What leads through the grove?', { dirt: 'A winding pale dirt trail.', stones: 'A line of small stepping stones.', none: 'An uninterrupted forest carpet.' }),
    colony: score('How closely do the mushrooms gather?', ['A few landmark mushrooms', 'A sheltered grove', 'A dense perimeter colony']),
    glow: noul('Do pale gills glow softly under the mushrooms?'),
    spores: noul('Are tiny floating spores visible in the sheltered air?'),
    roots: noul('Does a twisted exposed root frame the far edge?'),
  },
  build(a, context) {
    const { art: s, world } = diorama(context, { background: '#d7dfcc', floor: { moss: '#83956b', leaves: '#ad997a', bark: '#92877a' }[a.floor], width: 14, depth: 11, yaw: 23, pitch: 27, maxHeight: 3.2, radius: 1.4, slots: [[0, 1.6], [-3, -1.3], [3, -1.3], [-3.2, 3.2], [3.2, 3.2], [0, -3]] });
    const cap = s.material({ umbrella: '#bf756c', lantern: '#b99b62', shelves: '#9f86b3' }[a.canopy]), stalk = s.material('#d2c7a8'), moss = s.material('#829a63'), gill = s.material('#dcd8bc', { emissive: a.glow ? '#c7c99b' : '#000000', emissiveIntensity: a.glow ? 0.3 : 0 });
    const count = 6 + Math.round(a.colony * 8);
    for (let i = 0; i < count; i++) {
      const rear = i % 3 === 0, x = rear ? (context.random() - 0.5) * 11 : (i % 2 ? -1 : 1) * (5.4 + context.random() * 0.5), z = rear ? -4.4 : (context.random() - 0.5) * 8.6, height = (2.1 + a.scale * 3.4) * (0.66 + context.random() * 0.34), radius = height * (a.canopy === 'lantern' ? 0.25 : 0.4);
      s.tube([[x, 0, z], [x + 0.14, height * 0.5, z], [x, height, z]], height * 0.055, stalk);
      s.lathe(a.canopy === 'lantern' ? [[0, height + radius * 1.25], [radius * 0.5, height + radius * 0.8], [radius, height], [radius * 0.95, height - 0.04], [0, height - 0.05]] : [[0, height + radius * 0.55], [radius * 0.7, height + radius * 0.32], [radius, height], [radius * 0.94, height - 0.1], [0, height - 0.08]], cap, [x, 0, z]);
      for (let j = 0; j < 12; j++) { const t = j * Math.PI / 6; s.rod([x + Math.cos(t) * radius * 0.2, height - 0.09, z + Math.sin(t) * radius * 0.2], [x + Math.cos(t) * radius * 0.92, height - 0.04, z + Math.sin(t) * radius * 0.92], 0.014, gill); }
      if (a.canopy === 'umbrella') for (let j = 0; j < 8; j++) { const t = j * 2.4, rr = radius * (0.2 + context.random() * 0.65); s.ball([radius * 0.07, 0.025, radius * 0.06], [x + Math.cos(t) * rr, height + radius * 0.5 * Math.sqrt(Math.max(0, 1 - (rr / radius) ** 2)), z + Math.sin(t) * rr], stalk, 8); }
      s.ball([0.7, 0.12, 0.6], [x, 0.08, z], moss, 10);
    }
    if (a.path !== 'none') for (let i = 0; i < 13; i++) { const z = -4.5 + i * 0.77, x = Math.sin(i * 0.42) * 0.6; if (a.path === 'stones') s.ball([0.45, 0.035, 0.32], [x, 0.03, z], s.material('#b9b9a1'), 8); else s.ball([0.52, 0.013, 0.62], [x, 0.017, z], s.material('#bdaf8a'), 12); }
    if (a.roots) { const bark = s.material('#867157'); s.tube([[-6, 0.1, -4.7], [-3.5, 0.25, -4.8], [-1, 0.1, -4.3], [2, 0.32, -4.5], [6, 0.05, -4.8]], 0.19, bark); for (let i = 0; i < 6; i++) s.rod([i * 1.8 - 5, 0.1, -4.5], [i * 1.8 - 5.8, 0.05, -3.7], 0.08, bark, 0.02); }
    if (a.spores) { const particles: { at: [number, number, number]; size: number }[] = []; for (let i = 0; i < 60; i++) particles.push({ at: [(context.random() - 0.5) * 12, 0.4 + context.random() * 4.8, (context.random() - 0.5) * 9], size: 0.015 + context.random() * 0.015 }); s.scatter(new THREE.IcosahedronGeometry(1, 0), s.material('#e0dfb3'), particles); }
    return world;
  },
});
