import * as THREE from 'three';
import { Sculpture, choice, score, noul, defineThing } from '@conjure/kit';

export default defineThing({
  questions: {
    form: choice('How does the colony grow?', { antler: 'Forking upright staghorn branches.', plates: 'Broad overlapping horizontal coral plates.', fan: 'A lace-like fan spreading in one plane.', brain: 'A domed brain coral with winding ridges.' }),
    pigment: choice('What living coral pigment dominates?', { rose: 'Salmon pink with cream tips.', violet: 'Purple with pale lavender tips.', gold: 'Golden ochre with ivory tips.', blue: 'Deep blue with turquoise tips.', bleached: 'Chalk-white bleached skeleton.' }),
    stature: score('How large is the colony?', ['A hand-sized fragment', 'A knee-high coral head', 'An extensive reef colony']),
    spread: score('How wide is the growth relative to its height?', ['A narrow pillar', 'An even bush', 'A broad spreading colony']),
    tips: noul('Do pale growing tips stand out on the branches?'),
    polyps: noul('Are small flower-like polyps extended?'),
    foundation: choice('What anchors the coral?', { stone: 'A rounded limestone pedestal.', rubble: 'Several fractured reef stones.', none: 'The branches emerge from a small encrusted foot.' }),
  },
  build(a, context) {
    const s = new Sculpture(context), h = 0.16 + a.stature * 1.7, w = h * (0.45 + a.spread * 0.7);
    const pigment = { rose: '#d87876', violet: '#956bba', gold: '#cda657', blue: '#447da2', bleached: '#e9e3d0' }[a.pigment];
    const coral = s.material(pigment), tip = s.material('#f0e9cc'), rock = s.material('#a89d87', { flatShading: true });
    s.ball([w * 0.4, h * 0.06, w * 0.32], [0, h * 0.06, 0], rock, 10);
    if (a.foundation === 'rubble') for (let i = 0; i < 7; i++) { const t = i * 2.4; s.ball([h * 0.16, h * 0.08, h * 0.14], [Math.cos(t) * w * 0.35, h * 0.04, Math.sin(t) * w * 0.3], rock, 6); }
    if (a.form === 'antler' || a.form === 'fan') {
      const branch = (from: [number, number, number], angle: number, length: number, depth: number) => {
        const to: [number, number, number] = [from[0] + Math.sin(angle) * length * (a.form === 'fan' ? 1.2 : 0.7), from[1] + Math.cos(angle) * length, from[2] + (a.form === 'fan' ? 0 : (context.random() - 0.5) * length)];
        s.rod(from, to, h * (0.014 + depth * 0.012), coral, h * (0.01 + depth * 0.007));
        if (depth > 0) { branch(to, angle - 0.4 - context.random() * 0.25, length * 0.69, depth - 1); branch(to, angle + 0.4 + context.random() * 0.25, length * 0.69, depth - 1); }
        else { if (a.tips) s.ball([h * 0.017, h * 0.024, h * 0.017], to, tip, 8); if (a.polyps) for (let j = 0; j < 4; j++) { const t = j * Math.PI / 2; s.ball([h * 0.025, h * 0.009, h * 0.013], [to[0] + Math.cos(t) * h * 0.02, to[1], to[2] + Math.sin(t) * h * 0.02], tip, 8); } }
      };
      for (let i = 0; i < (a.form === 'fan' ? 3 : 5); i++) branch([(i - (a.form === 'fan' ? 1 : 2)) * w * 0.17, h * 0.11, 0], (i - 2) * 0.12, h * 0.37, 3);
    } else if (a.form === 'plates') {
      for (let i = 0; i < 6; i++) { const t = i * 2.4, radius = w * (0.28 + context.random() * 0.16); const p = s.ball([radius, h * 0.035, radius * 0.82], [Math.cos(t) * w * 0.2, h * (0.15 + i * 0.13), Math.sin(t) * w * 0.15], coral, 24); p.rotation.z = (context.random() - 0.5) * 0.18; if (a.tips) { const edge = s.ring(radius * 0.96, h * 0.013, p.position.toArray() as [number, number, number], tip); edge.rotation.x = Math.PI / 2; edge.scale.y = 0.82; } }
    } else {
      s.ball([w * 0.58, h * 0.43, w * 0.5], [0, h * 0.47, 0], coral, 24);
      for (let row = 0; row < 9; row++) { const z = (row - 4) * w * 0.105; const pts: [number, number, number][] = []; for (let j = 0; j < 19; j++) { const x = (j - 9) * w * 0.055; const y = h * 0.47 + h * 0.43 * Math.sqrt(Math.max(0, 1 - (x / (w * 0.6)) ** 2 - (z / (w * 0.55)) ** 2)); pts.push([x, y, z + Math.sin(j * 1.3 + row) * w * 0.023]); } s.tube(pts, h * 0.017, a.tips ? tip : coral); }
    }
    return s.finish({ footprint: w * 0.45 });
  },
});
