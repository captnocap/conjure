import * as THREE from 'three';
import { Sculpture, choice, score, noul, defineThing } from '@conjure/kit';

export default defineThing({
  questions: {
    size: score('How large is the fallen wood?', ['A small branch segment', 'A substantial fallen log', 'A broad old trunk']),
    species: choice('What bark does it carry?', { birch: 'Pale peeling birch bark.', oak: 'Deeply ridged dark oak bark.', cedar: 'Warm reddish cedar bark.' }),
    section: choice('How has it broken?', { sawn: 'One clean sawn end with growth rings.', snapped: 'Jagged splintered ends.', hollow: 'An open hollow trunk.' }),
    moss: score('How much moss grows over it?', ['A few small cushions', 'A strip along the top', 'A thick green carpet']),
    branches: noul('Are broken branch stubs still attached?'),
    fungi: noul('Do small shelf fungi emerge along the side?'),
    seedlings: noul('Have tiny seedlings taken root in its moss?'),
    orientation: choice('How does the log lie?', { flat: 'Flat on the forest floor.', propped: 'One end lifted by a supporting stone.', split: 'A second split fragment lies beside it.' }),
  },
  build(a, context) {
    const s = new Sculpture(context), length = 0.25 + a.size * 2.6, r = length * 0.16, bark = s.material({ birch: '#c6c1ad', oak: '#6e6252', cedar: '#99725a' }[a.species]), wood = s.material('#bba17b'), moss = s.material('#788f51'), dark = s.material('#534b40'), rise = a.orientation === 'propped' ? 0.22 : 0, centerY = r * 1.05 + length * rise / 2;
    const body = a.section === 'hollow' ? s.lathe([[r, -length / 2], [r, length / 2], [r * 0.72, length / 2], [r * 0.72, -length / 2], [r, -length / 2]], bark) : s.cylinder(r * 0.9, r, length, [0, 0, 0], bark, 18); body.rotation.z = Math.PI / 2 - rise; body.position.y = centerY;
    for (let end = -1; end <= 1; end += 2) { const x = end * length / 2, y = centerY + end * length * rise / 2; if (a.section !== 'hollow') { const disk = s.cylinder(r * 0.9, r * 0.9, r * 0.014, [x, y, 0], wood, 24); disk.rotation.z = Math.PI / 2; for (let i = 1; i < 6; i++) { const ring = s.ring(r * i * 0.14, r * 0.007, [x + end * r * 0.009, y, 0], dark); ring.rotation.y = Math.PI / 2; } } else { const rim = s.ring(r * 0.85, r * 0.08, [x, y, 0], wood); rim.rotation.y = Math.PI / 2; } if (a.section === 'snapped') for (let i = 0; i < 8; i++) { const t = i * Math.PI / 4; s.rod([x, y + Math.cos(t) * r * 0.7, Math.sin(t) * r * 0.7], [x + end * r * (0.25 + context.random() * 0.6), y + Math.cos(t) * r * 0.68, Math.sin(t) * r * 0.68], r * 0.055, wood, r * 0.005); } }
    for (let i = 0; i < 14; i++) { const t = i * Math.PI / 7; s.tube([[-length * 0.45, centerY + Math.cos(t) * r - length * rise * 0.45, Math.sin(t) * r], [0, centerY + Math.cos(t) * r * 1.02, Math.sin(t) * r], [length * 0.45, centerY + Math.cos(t) * r + length * rise * 0.45, Math.sin(t) * r]], r * 0.025, a.species === 'birch' && i % 3 === 0 ? dark : bark); }
    const patches = 2 + Math.round(a.moss * 13); for (let i = 0; i < patches; i++) { const x = (context.random() - 0.5) * length * 0.9, z = (context.random() - 0.5) * r, y = centerY + r * 0.95 + x * rise; s.ball([length * 0.09, r * 0.13, r * 0.45], [x, y, z], moss, 10); if (a.seedlings && i % 4 === 0) { s.rod([x, y, z], [x, y + r * 0.6, z], r * 0.014, moss); for (const side of [-1, 1]) { const leaf = s.ball([r * 0.17, r * 0.025, r * 0.065], [x + side * r * 0.12, y + r * 0.44, z], moss, 8); leaf.rotation.z = side * 0.45; } } }
    if (a.branches) for (let i = 0; i < 3; i++) { const x = (i - 1) * length * 0.25; s.rod([x, centerY + x * rise, -r * 0.6], [x + r * 0.3, centerY + r * 1.6 + x * rise, -r * 1.4], r * 0.25, bark, r * 0.13); }
    if (a.fungi) for (let i = 0; i < 4; i++) s.ball([r * 0.65, r * 0.07, r * 0.45], [(i - 1.5) * length * 0.15, centerY + r * 0.25, r * 0.9], s.material('#c1af87'), 12);
    if (a.orientation === 'propped') s.ball([r * 1.1, r * 0.65, r * 0.8], [length * 0.36, r * 0.55, 0], s.material('#91948a', { flatShading: true }), 7);
    if (a.orientation === 'split') { const piece = s.cylinder(r * 0.35, r * 0.4, length * 0.65, [0, r * 0.4, r * 1.75], wood, 8); piece.rotation.z = Math.PI / 2; piece.rotation.y = -0.15; }
    return s.finish();
  },
});
