import * as THREE from 'three';
import { Sculpture, choice, score, noul, defineThing } from '@conjure/kit';

export default defineThing({
  questions: {
    caps: choice('What shape have the mushroom caps?', { umbrella: 'Broad rounded umbrellas.', bell: 'Slender conical bells.', shelf: 'Flat overlapping shelf fungi.', cup: 'Open orange cups.' }),
    pigment: choice('What pigment colours the caps?', { scarlet: 'Fairytale red with cream spots.', ochre: 'Golden ochre and ivory.', ink: 'Grey ink caps with dark rims.', violet: 'Violet and pale lavender.', orange: 'Bright orange woodland fungi.' }),
    size: score('How tall are the fruiting bodies?', ['Tiny buttons', 'Hand-high mushrooms', 'Large forest mushrooms']),
    family: choice('How are the mushrooms grouped?', { solitary: 'One mature cap with two tiny buttons.', circle: 'A partial fairy ring.', troop: 'A close family of mixed heights.' }),
    spots: noul('Are pale flecks scattered over the caps?'),
    gills: noul('Are radial gills visible beneath the caps?'),
    bed: choice('What covers the ground patch?', { moss: 'Soft green moss.', litter: 'Leaf litter and twigs.', bark: 'Dark decaying wood.' }),
    ring: noul('Do the tall stems carry a small skirt-like ring?'),
  },
  build(a, context) {
    const s = new Sculpture(context), h = 0.025 + a.size * 0.26, cap = s.material({ scarlet: '#b94e45', ochre: '#b49048', ink: '#727478', violet: '#9a78af', orange: '#ce7a3f' }[a.pigment]), cream = s.material('#e2d7bd'), ground = s.material({ moss: '#6e8453', litter: '#8a7653', bark: '#655344' }[a.bed], { flatShading: true });
    const base = s.cylinder(h * 1.15, h, h * 0.08, [0, h * 0.04, 0], ground, 20); base.scale.z = 0.8;
    const count = a.family === 'solitary' ? 3 : a.family === 'circle' ? 7 : 6;
    for (let i = 0; i < count; i++) {
      const t = i * 2.4, f = i === 0 ? 1 : 0.35 + context.random() * 0.55, height = h * f, spread = a.family === 'circle' ? h * 0.78 : h * (i === 0 ? 0 : 0.48), x = Math.cos(t) * spread, z = Math.sin(t) * spread * 0.75, radius = height * (a.caps === 'bell' ? 0.28 : 0.57), y = height + h * 0.08;
      s.tube([[x, h * 0.08, z], [x + height * 0.06, height * 0.5, z], [x, y, z]], height * 0.075, cream);
      if (a.ring && f > 0.5) { const r = s.ring(height * 0.115, height * 0.035, [x, height * 0.64, z], cream); r.rotation.x = Math.PI / 2; }
      const profile: [number, number][] = a.caps === 'cup' ? [[0, y - height * 0.02], [radius * 0.4, y], [radius * 0.85, y + height * 0.2], [radius, y + height * 0.3], [radius * 0.83, y + height * 0.32], [radius * 0.58, y + height * 0.17], [0, y + height * 0.02]] : a.caps === 'bell' ? [[0, y + height * 0.5], [radius * 0.45, y + height * 0.4], [radius, y], [radius * 0.95, y - height * 0.015], [0, y - height * 0.03]] : [[0, y + height * (a.caps === 'shelf' ? 0.08 : 0.32)], [radius * 0.6, y + height * 0.17], [radius, y], [radius * 0.95, y - height * 0.035], [0, y - height * 0.02]];
      s.lathe(profile, cap, [x, 0, z]);
      if (a.spots && a.caps !== 'cup') for (let j = 0; j < 10; j++) { const u = j * 2.4, rr = radius * Math.sqrt((j + 0.5) / 10) * 0.85, top = y + height * (a.caps === 'bell' ? 0.5 * (1 - rr / radius) : 0.3 * Math.sqrt(Math.max(0, 1 - (rr / radius) ** 2))); s.ball([radius * 0.075, height * 0.018, radius * 0.06], [x + Math.cos(u) * rr, top, z + Math.sin(u) * rr], cream, 8); }
      if (a.gills && a.caps !== 'cup') for (let j = 0; j < 16; j++) { const u = j * Math.PI / 8; s.rod([x + Math.cos(u) * radius * 0.22, y - height * 0.04, z + Math.sin(u) * radius * 0.22], [x + Math.cos(u) * radius * 0.9, y - height * 0.025, z + Math.sin(u) * radius * 0.9], height * 0.005, cream); }
    }
    for (let i = 0; i < 8; i++) { const t = i * 2.4; if (a.bed === 'litter') { const l = s.ball([h * 0.16, h * 0.008, h * 0.05], [Math.cos(t) * h * 0.88, h * 0.09, Math.sin(t) * h * 0.6], ground, 8); l.rotation.y = t; } else s.ball([h * 0.15, h * 0.04, h * 0.12], [Math.cos(t) * h * 0.8, h * 0.08, Math.sin(t) * h * 0.55], ground, 8); }
    return s.finish();
  },
});
