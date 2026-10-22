import * as THREE from 'three';
import { Sculpture, choice, score, noul, defineThing } from '@conjure/kit';

export default defineThing({
  questions: {
    mineral: choice('What crystals line the cavity?', { amethyst: 'Purple amethyst crystals.', quartz: 'Milky white quartz points.', citrine: 'Honey gold citrine.', celestite: 'Pale blue celestite.', emerald: 'Green fantasy mineral crystals.' }),
    size: score('How large is the geode?', ['A hand-sized specimen', 'A large display stone', 'A tall cathedral geode']),
    opening: choice('How is the stone opened?', { bowl: 'A broken low bowl showing its interior.', cathedral: 'An upright arched cavity.', split: 'Two halves opened like a mineral book.' }),
    points: score('How tall are the crystal points?', ['A fine druse lining', 'Distinct small points', 'Long clustered prisms']),
    rind: choice('What stone surrounds the crystals?', { basalt: 'Dark volcanic rind.', chalk: 'Pale chalky rock.', agate: 'Layered brown and cream agate bands.' }),
    matrix: noul('Are small crystals scattered around the foot?'),
    luminous: noul('Do the crystal interiors have an otherworldly glow?'),
    core: noul('Does one large crystal rise from the centre of the cavity?'),
  },
  build(a, context) {
    const s = new Sculpture(context), size = 0.09 + a.size * 1.15, color = { amethyst: '#a48abc', quartz: '#ddd9cb', citrine: '#c6ac68', celestite: '#9cbacb', emerald: '#68a184' }[a.mineral], stone = s.material({ basalt: '#66716e', chalk: '#c0bca9', agate: '#9f8268' }[a.rind], { flatShading: true }), crystal = s.material(color, { metalness: 0.15, roughness: 0.28, flatShading: true, emissive: a.luminous ? color : '#000000', emissiveIntensity: a.luminous ? 0.32 : 0 }), inner = s.material('#c8bba4');
    const halves = a.opening === 'split' ? 2 : 1;
    for (let half = 0; half < halves; half++) {
      const ox = halves === 2 ? (half - 0.5) * size * 0.9 : 0, upright = a.opening === 'cathedral', r = size * (upright ? 0.35 : 0.48), h = size * (upright ? 0.82 : 0.25);
      for (let i = 0; i < 24; i++) { const t = i * Math.PI * 2 / 24, x = ox + Math.cos(t) * r, y = upright ? size * 0.45 + Math.sin(t) * h * 0.5 : size * 0.15 + Math.sin(t) * size * 0.015, z = upright ? -size * 0.04 : Math.sin(t) * r * 0.85; s.ball([size * 0.095, size * (upright ? 0.115 : 0.12), size * 0.095], [x, y, z], stone, 6); if (a.rind === 'agate') { const band = s.ball([size * 0.067, size * 0.06, size * 0.035], [x * 0.95 + ox * 0.05, y, z + size * 0.065], inner, 6); band.rotation.z = t; } }
      const back = s.ball([r * 0.9, upright ? h * 0.43 : size * 0.045, upright ? size * 0.06 : r * 0.8], [ox, upright ? size * 0.45 : size * 0.04, upright ? -size * 0.09 : 0], stone, 14);
      for (let i = 0; i < 48; i++) { const t = i * 2.4, rr = Math.sqrt((i + 0.5) / 48), height = size * (0.03 + a.points * (0.08 + context.random() * 0.12)), x = ox + Math.cos(t) * r * rr * 0.76, y = upright ? size * 0.45 + Math.sin(t) * h * 0.38 * rr : size * 0.08, z = upright ? size * 0.01 : Math.sin(t) * r * rr * 0.67; const prism = s.cylinder(size * 0.024, size * 0.035, height, [x, y + (upright ? 0 : height / 2), z + (upright ? height / 2 : 0)], crystal, 6); const point = s.cylinder(0, size * 0.024, height * 0.38, [x, y + (upright ? 0 : height * 1.18), z + (upright ? height * 1.18 : 0)], crystal, 6); if (upright) { prism.rotation.x = point.rotation.x = Math.PI / 2; } else prism.rotation.z = (context.random() - 0.5) * 0.35; }
      if (a.core) { const y = upright ? size * 0.22 : size * 0.1; s.cylinder(size * 0.07, size * 0.085, size * 0.38, [ox, y + size * 0.19, size * 0.04], crystal, 6); s.cylinder(0, size * 0.07, size * 0.13, [ox, y + size * 0.445, size * 0.04], crystal, 6); }
      back.castShadow = true;
    }
    if (a.matrix) for (let i = 0; i < 6; i++) { const t = i * 2.4; s.cylinder(0, size * 0.035, size * 0.13, [Math.cos(t) * size * 0.57, size * 0.065, Math.sin(t) * size * 0.47], crystal, 5); }
    return s.finish();
  },
});
