import * as THREE from 'three';
import { Sculpture, choice, score, noul, defineThing } from '@conjure/kit';

export default defineThing({
  questions: {
    form: choice('What shape has the glacial field?', { tongue: 'A long narrow glacier tongue.', shelf: 'A wide low shelf with a broken edge.', valley: 'A stepped glacier between rocky shoulders.' }),
    extent: score('How broad is the glacier fragment?', ['A compact ice face', 'A large glacier tongue', 'A sweeping ice shelf']),
    tint: choice('What colour is the ice?', { blue: 'Pale blue with dark crevasses.', white: 'White snow over blue ice.', green: 'Turquoise ice stained by minerals.' }),
    crevasses: score('How split is its surface?', ['Mostly smooth ice', 'A few deep fractures', 'A labyrinth of fissures']),
    moraine: noul('Do dark moraine stones line the glacier sides?'),
    seracs: noul('Do tall fractured seracs rise near the front?'),
    melt: noul('Does a blue meltwater channel wind through the ice?'),
    calving: noul('Have separate ice blocks broken away from the front?'),
  },
  build(a, context) {
    const s = new Sculpture(context), width = 20 + a.extent * 500, depth = width * (a.form === 'tongue' ? 1.3 : 0.75), ice = s.material({ blue: '#a7c4d0', white: '#dee2d6', green: '#97c5bd' }[a.tint], { flatShading: true }), deep = s.material('#678f9f'), snow = s.material('#e4e9df'), rock = s.material('#7c7f79', { flatShading: true }), rows = 7, cols = a.form === 'tongue' ? 5 : 8;
    for (let row = 0; row < rows; row++) for (let col = 0; col < cols; col++) {
      const x = (col - (cols - 1) / 2) * width / cols, z = (row - (rows - 1) / 2) * depth / rows, gap = a.crevasses * (0.03 + context.random() * 0.06), height = width * (0.085 + row * 0.018 + context.random() * 0.035), block = s.box([width / cols * (1 - gap), height, depth / rows * (1 - gap)], [x, height / 2, z], ice); block.rotation.y = (context.random() - 0.5) * a.crevasses * 0.04;
      if (a.tint === 'white') s.box([width / cols * (0.95 - gap), width * 0.008, depth / rows * (0.95 - gap)], [x, height + width * 0.004, z], snow);
      if (a.seracs && row < 2 && col % 2 === 0) { const serac = s.cylinder(width * 0.018, width * 0.035, width * 0.16, [x, height + width * 0.06, z], ice, 5); serac.rotation.z = (context.random() - 0.5) * 0.25; }
    }
    if (a.moraine || a.form === 'valley') for (let i = 0; i < 20; i++) { const side = i % 2 ? -1 : 1, z = (i / 20 - 0.5) * depth, rockH = width * (a.form === 'valley' ? 0.18 + context.random() * 0.18 : 0.025); s.ball([width * 0.07, rockH, width * 0.09], [side * width * 0.51, rockH * 0.6, z], rock, 6); }
    if (a.melt) s.tube([[-width * 0.12, width * 0.22, depth * 0.44], [width * 0.05, width * 0.18, depth * 0.1], [-width * 0.1, width * 0.14, -depth * 0.15], [width * 0.13, width * 0.1, -depth * 0.5]], width * 0.012, deep);
    if (a.calving) for (let i = 0; i < 5; i++) { const h = width * (0.025 + context.random() * 0.04), b = s.box([width * 0.07, h, width * 0.08], [(i - 2) * width * 0.15, h / 2, -depth * (0.6 + context.random() * 0.16)], ice); b.rotation.set(0.1, context.random(), 0.2); }
    return s.finish();
  },
});
