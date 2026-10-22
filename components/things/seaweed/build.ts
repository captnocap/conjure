import * as THREE from 'three';
import { Sculpture, choice, score, noul, defineThing } from '@conjure/kit';

export default defineThing({
  questions: {
    species: choice('Which seaweed form grows here?', { kelp: 'Tall stalks carrying long ribbon blades.', lettuce: 'Wide ruffled sea-lettuce sheets.', grapes: 'Branching stalks with small round sea grapes.' }),
    pigment: choice('What colour has the algae?', { olive: 'Olive brown kelp.', emerald: 'Rich emerald sea lettuce.', red: 'Wine red marine algae.', gold: 'Golden sunlit blades.' }),
    height: score('How tall are the fronds?', ['A small tide-pool tuft', 'Waist-high blades', 'Tall forest kelp']),
    blades: score('How many stalks emerge from the holdfast?', ['Three isolated stalks', 'A full tuft', 'A crowded cluster']),
    current: choice('Which current shape bends the plant?', { calm: 'Almost vertical blades.', bent: 'All blades bow in one direction.', tangled: 'Blades curl and cross one another.' }),
    bladders: noul('Are buoyant air bladders visible near the blades?'),
    anchor: choice('What holds it to the bottom?', { rock: 'A rough pebble with gripping roots.', sand: 'A compact sandy root mound.', bare: 'An exposed clawlike holdfast.' }),
  },
  build(a, context) {
    const s = new Sculpture(context), h = 0.12 + a.height * 2.8, color = { olive: '#6c7940', emerald: '#448356', red: '#985255', gold: '#a9a74f' }[a.pigment], mat = s.material(color, { side: THREE.DoubleSide }), stem = s.material('#726546');
    if (a.anchor !== 'bare') s.ball([h * 0.17, h * 0.055, h * 0.13], [0, h * 0.03, 0], s.material(a.anchor === 'sand' ? '#bdac83' : '#7f8680', { flatShading: true }), 8);
    for (let i = 0; i < 8; i++) { const t = i * Math.PI / 4; s.tube([[0, h * 0.08, 0], [Math.cos(t) * h * 0.08, h * 0.025, Math.sin(t) * h * 0.08], [Math.cos(t) * h * 0.16, h * 0.01, Math.sin(t) * h * 0.16]], h * 0.007, stem); }
    const count = 3 + Math.round(a.blades * 7);
    for (let i = 0; i < count; i++) {
      const angle = i * 2.4, height = h * (0.65 + context.random() * 0.35), lean = a.current === 'bent' ? 0.42 : (context.random() - 0.5) * (a.current === 'tangled' ? 0.8 : 0.22);
      const path: [number, number, number][] = [];
      for (let j = 0; j < 10; j++) { const f = j / 9; path.push([Math.cos(angle) * h * 0.06 + lean * height * f * f + Math.sin(f * 6 + i) * h * 0.04 * f, height * f + h * 0.04, Math.sin(angle) * h * 0.06 + Math.sin(f * 3 + i) * h * 0.09 * f]); }
      s.tube(path, h * 0.006, stem);
      if (a.species === 'grapes') for (let j = 2; j < 9; j++) for (const side of [-1, 1]) { const p = path[j]; s.rod(p, [p[0] + side * h * 0.09, p[1] + h * 0.035, p[2]], h * 0.004, stem); s.ball([h * 0.025, h * 0.035, h * 0.025], [p[0] + side * h * 0.09, p[1] + h * 0.035, p[2]], mat, 10); }
      else {
        const positions: number[] = [], indices: number[] = [];
        path.forEach((p, j) => { const f = j / 9, width = h * (a.species === 'lettuce' ? 0.14 : 0.06) * Math.sin(Math.PI * f) * (1 + Math.sin(j * 2.6) * 0.2); positions.push(p[0] - width, p[1], p[2] + Math.sin(j * 1.7) * width * 0.4, p[0] + width, p[1], p[2] - Math.sin(j * 1.7) * width * 0.4); if (j < 9) { const k = j * 2; indices.push(k, k + 1, k + 2, k + 1, k + 3, k + 2); } });
        const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3)); g.setIndex(indices); g.computeVertexNormals(); s.mesh(g, mat);
        if (a.bladders) for (let j = 2; j < 9; j += 3) s.ball([h * 0.026, h * 0.04, h * 0.026], path[j], stem, 10);
      }
    }
    return s.finish({ footprint: h * 0.16 });
  },
});
