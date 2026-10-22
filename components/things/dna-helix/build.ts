import * as THREE from 'three';
import { Sculpture, choice, score, noul, defineThing } from '@conjure/kit';

export default defineThing({
  questions: {
    conformation: choice('How is the DNA model presented?', { helix: 'A familiar right-handed double helix.', compact: 'A tightly twisted compact helix.', ladder: 'An untwisted ladder showing paired bases.', split: 'A helix with the top strands partly unzipped.' }),
    size: score('How tall is the teaching sculpture?', ['A small desk model', 'A tabletop demonstration', 'A tall gallery sculpture']),
    turns: score('How many turns are shown?', ['One clear turn', 'Two or three turns', 'Several repeated turns']),
    palette: choice('How are molecular parts colour-coded?', { classic: 'Blue and red backbones, green and gold bases.', pastel: 'Sage and lilac backbones, cream and rose bases.', monochrome: 'Ivory backbones and grey bases.', neon: 'Turquoise and magenta backbones, bright yellow bases.' }),
    beads: noul('Are sugar and phosphate beads shown along the backbone?'),
    bonds: noul('Do small connecting hydrogen-bond beads appear between paired bases?'),
    base: choice('What supports the model?', { pedestal: 'A circular display pedestal.', frame: 'A simple rectangular demonstration frame.', bare: 'The strands end directly at the surface.' }),
    letters: noul('Do small A–T and G–C labels annotate the model base?'),
  },
  build(a, context) {
    const s = new Sculpture(context), h = 0.25 + a.size * 1.8, r = h * 0.13, count = 18 + Math.round(a.turns * 18), turns = (1 + a.turns * 3) * (a.conformation === 'compact' ? 1.35 : 1), palettes = { classic: ['#7e9db8', '#bd8982', '#8caa81', '#c9b475'], pastel: ['#9eb6a1', '#b4a1bf', '#ded1ae', '#c79aab'], monochrome: ['#d5d6c8', '#c0c7c3', '#929e9b', '#b2b6a3'], neon: ['#77baba', '#bd86b1', '#d2be72', '#94b39d'] }, c = palettes[a.palette], left = s.material(c[0]), right = s.material(c[1]), pairA = s.material(c[2]), pairB = s.material(c[3]), support = s.material('#a4aaa0'), baseY = a.base === 'bare' ? 0 : h * 0.045;
    if (a.base !== 'bare') s.cylinder(r * 1.65, r * 1.8, baseY, [0, baseY / 2, 0], support, 32);
    const strands: [number, number, number][][] = [[], []];
    for (let i = 0; i <= count; i++) {
      const f = i / count, angle = a.conformation === 'ladder' ? 0 : f * turns * Math.PI * 2, opening = a.conformation === 'split' ? Math.max(0, f - 0.68) * r * 3 : 0, p: [number, number, number] = [Math.cos(angle) * r + opening, baseY + f * h, Math.sin(angle) * r], q: [number, number, number] = [-Math.cos(angle) * r - opening, baseY + f * h, -Math.sin(angle) * r]; strands[0].push(p); strands[1].push(q);
      if (a.beads) { s.ball([h * 0.025, h * 0.025, h * 0.025], p, left, 10); s.ball([h * 0.025, h * 0.025, h * 0.025], q, right, 10); }
      if (!(a.conformation === 'split' && f > 0.72)) { const mid: [number, number, number] = [0, baseY + f * h, 0]; s.rod(p, mid, h * 0.017, i % 2 ? pairB : pairA); s.rod(mid, q, h * 0.017, i % 2 ? pairA : pairB); if (a.bonds) for (let j = -1; j <= 1; j++) s.ball([h * 0.012, h * 0.012, h * 0.012], [Math.cos(angle) * j * r * 0.13, mid[1], Math.sin(angle) * j * r * 0.13], support, 8); }
    }
    s.tube(strands[0], h * 0.012, left); s.tube(strands[1], h * 0.012, right);
    if (a.base === 'frame') { for (const side of [-1, 1]) s.rod([side * r * 1.65, baseY, 0], [side * r * 1.65, h + baseY + r * 0.2, 0], h * 0.014, support); s.rod([-r * 1.65, h + baseY + r * 0.2, 0], [r * 1.65, h + baseY + r * 0.2, 0], h * 0.014, support); }
    if (a.letters) { s.label('A - T', r * 1.15, h * 0.065, [-r * 0.6, baseY + h * 0.075, r * 1.25]); s.label('G - C', r * 1.15, h * 0.065, [r * 0.6, baseY + h * 0.075, r * 1.25]); }
    return s.finish();
  },
});
