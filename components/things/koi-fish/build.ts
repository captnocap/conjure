import * as THREE from 'three';
import { Sculpture, choice, score, noul, defineThing } from '@conjure/kit';

export default defineThing({
  questions: {
    pattern: choice('What koi pattern is visible?', { kohaku: 'White body with scarlet islands.', sanke: 'White, scarlet and charcoal patches.', gold: 'A solid metallic golden koi.', black: 'Dark body with pale silver markings.', blue: 'Slate-blue back over a pale belly.' }),
    size: score('How long is the fish?', ['A juvenile koi', 'A mature pond fish', 'A large old koi']),
    fins: choice('What kind of fins does it have?', { short: 'Compact traditional carp fins.', flowing: 'Long flowing butterfly-koi fins.', ragged: 'Uneven ragged-edged fins.' }),
    tail: choice('How does its tail move?', { straight: 'Tail aligned straight behind it.', left: 'Tail sweeps to the left.', right: 'Tail sweeps to the right.' }),
    scales: score('How clearly are the scales defined?', ['Smooth colour fields', 'A few rows of raised scales', 'A regular overlapping scale pattern']),
    barbels: noul('Are two fine whisker-like barbels visible beside the mouth?'),
    mouth: noul('Is its circular mouth open as it approaches the surface?'),
  },
  build(a, context) {
    const s = new Sculpture(context), length = 0.12 + a.size * 0.8, u = length / 2, body = s.material(a.pattern === 'gold' ? '#c5ad67' : a.pattern === 'black' ? '#677575' : a.pattern === 'blue' ? '#9cb1be' : '#e1dfca', { roughness: 0.4, metalness: a.pattern === 'gold' ? 0.22 : 0 }), pale = s.material('#dddcc5', { side: THREE.DoubleSide }), red = s.material('#bd765e'), dark = s.material('#535c58'), y = u * 0.24;
    s.ball([u * 0.23, u * 0.25, u * 0.77], [0, y, 0], body, 24);
    s.ball([u * 0.19, u * 0.2, u * 0.23], [0, y, u * 0.6], body, 18);
    const bend = a.tail === 'left' ? -u * 0.27 : a.tail === 'right' ? u * 0.27 : 0;
    s.tube([[0, y, -u * 0.45], [bend * 0.4, y, -u * 0.75], [bend, y, -u]], u * 0.07, body);
    const fin = (points: [number, number, number][], material: THREE.Material) => { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(points.flat(), 3)); g.computeVertexNormals(); return s.mesh(g, material); };
    const reach = a.fins === 'flowing' ? 1.65 : 1;
    for (const side of [-1, 1]) {
      fin([[side * u * 0.17, y, u * 0.22], [side * u * 0.62 * reach, y - u * 0.06, u * 0.11], [side * u * 0.37, y - u * 0.04, -u * 0.13]], pale);
      fin([[bend, y, -u * 0.91], [bend, y + side * u * 0.36, -u * (1.32 * reach)], [bend, y + side * u * 0.06, -u * 1.14]], pale);
      for (let i = 0; i < 4; i++) s.rod([side * u * 0.17, y + u * 0.004, u * 0.22], [side * u * (0.35 + i * 0.055) * reach, y - u * 0.04, u * (0.08 - i * 0.035)], u * 0.003, body);
      if (a.fins === 'ragged') for (let i = 0; i < 5; i++) { const f = i / 4, x = side * u * (0.34 + f * 0.2), z = u * (0.01 + f * 0.075); fin([[x, y - u * 0.06, z], [x + side * u * (0.05 + i % 2 * 0.05), y - u * 0.07, z - u * 0.025], [x + side * u * 0.015, y - u * 0.06, z + u * 0.055]], pale); }
      s.ball([u * 0.034, u * 0.039, u * 0.025], [side * u * 0.165, y + u * 0.025, u * 0.62], dark, 10);
      if (a.barbels) s.tube([[side * u * 0.05, y - u * 0.04, u * 0.81], [side * u * 0.13, y - u * 0.11, u * 0.89], [side * u * 0.19, y - u * 0.1, u * 0.86]], u * 0.006, pale);
    }
    fin([[0, y + u * 0.2, u * 0.35], [0, y + u * 0.48, -u * 0.15], [0, y + u * 0.22, -u * 0.55]], pale);
    if (a.pattern === 'kohaku' || a.pattern === 'sanke') for (let i = 0; i < 5; i++) { const z = u * (-0.48 + i * 0.24), x = (context.random() - 0.5) * u * 0.18, yy = y + u * 0.24 * Math.sqrt(Math.max(0, 1 - (z / (u * 0.8)) ** 2)); s.ball([u * 0.13, u * 0.016, u * 0.12], [x, yy, z], a.pattern === 'sanke' && i % 3 === 0 ? dark : red, 12); }
    if (a.pattern === 'black') for (let i = 0; i < 4; i++) s.ball([u * 0.09, u * 0.014, u * 0.11], [i % 2 ? -u * 0.07 : u * 0.07, y + u * 0.23, (i - 1.5) * u * 0.25], pale, 10);
    if (a.scales > 0.25) for (let row = 0; row < 3; row++) for (let i = 0; i < 12; i++) { const z = -u * 0.53 + i * u * 0.09, t = (row - 1) * 0.65, yy = y + Math.cos(t) * u * 0.245 * Math.sqrt(Math.max(0, 1 - (z / (u * 0.8)) ** 2)); s.ball([u * 0.036, u * 0.008, u * 0.04], [Math.sin(t) * u * 0.2, yy, z], body, 8); }
    if (a.mouth) { const rim = s.ring(u * 0.065, u * 0.012, [0, y - u * 0.03, u * 0.83], pale); s.ball([u * 0.052, u * 0.05, u * 0.008], [0, y - u * 0.03, u * 0.831], dark, 10); rim.rotation.x = -0.15; }
    return s.finish();
  },
});
