import * as THREE from 'three';
import { Sculpture, choice, score, noul, defineThing } from '@conjure/kit';

export default defineThing({
  questions: {
    kind: choice('What beetle form is it?', { jewel: 'A smooth oval jewel beetle.', stag: 'A broad beetle with branching stag mandibles.', rhino: 'A domed rhinoceros beetle with a curved horn.', ladybird: 'A rounded ladybird with spotted wing cases.' }),
    size: score('How large is the beetle?', ['A tiny leaf beetle', 'A thumb-sized beetle', 'A large tropical beetle']),
    shell: choice('What colour is the armour?', { emerald: 'Metallic green.', copper: 'Warm copper.', midnight: 'Blue-black.', ruby: 'Glossy red.', ivory: 'Pale cream with dark markings.' }),
    ridges: score('How deeply are the wing cases ridged?', ['Smooth shell', 'Fine longitudinal ribs', 'Strong fluted armour']),
    antenna: choice('What shape are the antennae?', { thread: 'Slender bent threads.', club: 'Rounded clubs at the tips.', fan: 'A small fan of plates at each tip.' }),
    open: noul('Are the paired wing cases slightly open?'),
    spotted: noul('Are dark round markings present on the shell?'),
    perch: noul('Does the beetle stand on a small bark chip?'),
  },
  build(a, context) {
    const s = new Sculpture(context), length = 0.012 + a.size * 0.085, u = length / 2, dark = s.material('#424945'), shell = s.material({ emerald: '#4f9270', copper: '#a98358', midnight: '#505d74', ruby: '#b95648', ivory: '#d3ccb4' }[a.shell], { roughness: 0.3, metalness: a.shell === 'emerald' || a.shell === 'copper' ? 0.45 : 0.08 }), y = u * 0.28;
    if (a.perch) { const chip = s.box([u * 1.4, u * 0.09, u * 2.1], [0, u * 0.045, 0], s.material('#897257', { flatShading: true })); chip.rotation.y = -0.12; }
    s.ball([u * 0.43, u * 0.18, u * 0.58], [0, y, -u * 0.22], dark, 14);
    for (const side of [-1, 1]) {
      const cover = s.ball([u * 0.29, u * (a.kind === 'ladybird' ? 0.38 : 0.24), u * 0.65], [side * u * (a.open ? 0.25 : 0.145), y + u * 0.07, -u * 0.24], shell, 20); cover.rotation.z = side * (a.open ? -0.35 : -0.06);
      if (a.ridges > 0.2) for (let j = 0; j < 4; j++) { const x = side * u * (0.08 + j * 0.095); s.tube([[x, y + u * 0.23, -u * 0.76], [x, y + u * 0.32, -u * 0.2], [x, y + u * 0.2, u * 0.31]], u * 0.009 * a.ridges, dark); }
      if (a.spotted || a.kind === 'ladybird') for (let i = 0; i < 3; i++) s.ball([u * 0.074, u * 0.014, u * 0.08], [side * u * 0.25, y + u * (a.kind === 'ladybird' ? 0.43 : 0.28), u * (-0.57 + i * 0.3)], dark, 10);
      for (let leg = 0; leg < 3; leg++) { const z = u * (0.42 - leg * 0.48), dx = u * (leg === 1 ? 0.82 : 0.64), endZ = z + u * (leg === 0 ? 0.36 : leg === 2 ? -0.35 : -0.03); s.tube([[side * u * 0.25, y, z], [side * dx, u * 0.19, endZ], [side * dx * 1.05, u * 0.065, endZ + u * 0.12]], u * 0.022, dark); }
      s.tube([[side * u * 0.15, y + u * 0.05, u * 0.7], [side * u * 0.44, y + u * 0.17, u * 0.94], [side * u * 0.56, y + u * 0.24, u * 1.13]], u * 0.014, dark);
      if (a.antenna === 'club') s.ball([u * 0.043, u * 0.034, u * 0.061], [side * u * 0.56, y + u * 0.24, u * 1.13], dark, 10);
      if (a.antenna === 'fan') for (let j = 0; j < 3; j++) s.rod([side * u * 0.54, y + u * 0.24, u * 1.1], [side * u * (0.6 + j * 0.045), y + u * (0.29 + j * 0.05), u * (1.1 + j * 0.025)], u * 0.022, dark, u * 0.012);
      if (a.kind === 'stag') { s.tube([[side * u * 0.14, y + u * 0.05, u * 0.76], [side * u * 0.38, y + u * 0.09, u * 1.3], [side * u * 0.19, y + u * 0.11, u * 1.6]], u * 0.065, shell); for (let i = 0; i < 3; i++) s.rod([side * u * 0.31, y + u * 0.09, u * (1 + i * 0.19)], [side * u * 0.1, y + u * 0.1, u * (1.1 + i * 0.17)], u * 0.025, shell, u * 0.005); }
    }
    s.ball([u * 0.33, u * 0.2, u * 0.24], [0, y + u * 0.02, u * 0.43], shell, 14);
    s.ball([u * 0.23, u * 0.15, u * 0.22], [0, y, u * 0.72], dark, 12);
    if (a.kind === 'rhino') s.tube([[0, y + u * 0.1, u * 0.7], [0, y + u * 0.48, u * 0.95], [0, y + u * 0.8, u * 0.85]], u * 0.064, shell);
    return s.finish();
  },
});
