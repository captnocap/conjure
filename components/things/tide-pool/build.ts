import * as THREE from 'three';
import { Sculpture, choice, score, noul, defineThing } from '@conjure/kit';

export default defineThing({
  questions: {
    size: score('How broad is the pool?', ['A small hollow in a rock', 'A shallow basin', 'A broad tide pool']),
    shape: choice('What shape is the basin?', { round: 'A nearly circular bowl.', oval: 'An elongated rock fissure.', crescent: 'A curved pool enclosed by an arc of stones.' }),
    rock: choice('What stone forms the rim?', { basalt: 'Dark angular volcanic rock.', granite: 'Grey rounded granite.', sandstone: 'Layered warm sandstone.' }),
    water: choice('How does the water look?', { clear: 'Clear pale turquoise.', green: 'Olive green with algae.', mirror: 'Silvery water reflecting the sky.' }),
    anemones: noul('Are flower-like sea anemones living at the rim?'),
    starfish: noul('Has a five-armed starfish settled near the edge?'),
    shells: noul('Are small pale shells caught between the rocks?'),
    algae: noul('Do green algae drape over the wet rocks?'),
  },
  build(a, context) {
    const s = new Sculpture(context), r = 0.22 + a.size * 1.7, zScale = a.shape === 'oval' ? 0.55 : 0.85, rock = s.material({ basalt: '#5a6669', granite: '#8e9693', sandstone: '#b19978' }[a.rock], { flatShading: true }), wet = s.material({ clear: '#8fbfb9', green: '#889b77', mirror: '#becbce' }[a.water], { roughness: 0.2, metalness: 0.12 }), algae = s.material('#668547');
    const bed = s.cylinder(r, r * 0.92, r * 0.16, [0, r * 0.08, 0], rock, 20); bed.scale.z = zScale;
    const pool = s.cylinder(r * 0.78, r * 0.8, r * 0.025, [0, r * 0.17, 0], wet, 48); pool.scale.z = zScale;
    for (let i = 0; i < 18; i++) {
      const t = i * Math.PI * 2 / 18, rr = r * (0.86 + context.random() * 0.05); if (a.shape === 'crescent' && i > 6 && i < 10) continue;
      const p: [number, number, number] = [Math.cos(t) * rr, r * 0.2, Math.sin(t) * rr * zScale];
      const b = s.ball([r * 0.19, r * (0.12 + context.random() * 0.06), r * 0.17], p, rock, 8); b.rotation.set(context.random(), context.random(), context.random());
      if (a.algae && i % 3 === 0) s.ball([r * 0.15, r * 0.015, r * 0.12], [p[0], r * 0.32, p[2]], algae, 10);
      if (a.shells && i % 4 === 0) { const sh = s.ball([r * 0.075, r * 0.022, r * 0.05], [p[0] * 0.85, r * 0.19, p[2] * 0.85], s.material('#e5d8bc'), 10); sh.rotation.y = t; }
    }
    if (a.anemones) { const pink = s.material('#b9869a'); for (let i = 0; i < 3; i++) { const t = i * 2.2, x = Math.cos(t) * r * 0.56, z = Math.sin(t) * r * 0.4; s.cylinder(r * 0.05, r * 0.06, r * 0.08, [x, r * 0.23, z], pink, 12); for (let j = 0; j < 10; j++) { const u = j * Math.PI / 5; s.tube([[x, r * 0.27, z], [x + Math.cos(u) * r * 0.06, r * 0.36, z + Math.sin(u) * r * 0.06], [x + Math.cos(u) * r * 0.09, r * 0.32, z + Math.sin(u) * r * 0.09]], r * 0.008, pink); } } }
    if (a.starfish) { const orange = s.material('#c78658'), x = r * 0.28, z = r * 0.15; s.ball([r * 0.08, r * 0.023, r * 0.08], [x, r * 0.19, z], orange, 10); for (let i = 0; i < 5; i++) { const t = i * Math.PI * 2 / 5; s.rod([x, r * 0.19, z], [x + Math.cos(t) * r * 0.24, r * 0.18, z + Math.sin(t) * r * 0.24], r * 0.055, orange, r * 0.008); } }
    return s.finish();
  },
});
