import * as THREE from 'three';
import { choice, score, noul, defineWorld, diorama } from '@conjure/kit';

export default defineWorld({
  questions: {
    bench: choice('What surface supports the specimens?', { ceramic: 'A pale ceramic laboratory bench.', glass: 'An icy blue glass specimen stage.', slate: 'A charcoal mineral study surface.' }),
    containment: choice('How is the observation area enclosed?', { open: 'An open specimen bench.', hood: 'A pale framed laboratory hood.', petri: 'A low circular specimen-dish rim.' }),
    grid: score('How prominent are the calibrated measurement markings?', ['A few edge ticks', 'A fine rectangular measurement grid', 'A clear ruled specimen field']),
    instrument: choice('Which instrument stands at the rear?', { microscope: 'A simple articulated microscope.', pipettes: 'A rack of pipettes and sample tubes.', spectrometer: 'A compact instrument with a digital display.' }),
    diagram: choice('What diagram is shown behind the specimens?', { bases: 'Paired molecular base symbols.', lattice: 'A geometric crystal lattice.', cells: 'A cluster of simplified cell outlines.' }),
    glassware: noul('Are small flasks and beakers grouped at one margin?'),
    labels: noul('Are specimen tags visible beside the observation area?'),
    scale: noul('Does a tall calibration ruler frame the back corner?'),
  },
  build(a, context) {
    const { art: s, world } = diorama(context, { background: '#dce5e1', floor: { ceramic: '#c8d4cc', glass: '#adc8c8', slate: '#a0afad' }[a.bench], width: 15, depth: 11, yaw: 22, pitch: 29, maxHeight: 3.2, radius: 1.5, slots: [[0, 1.5], [-3, -1.2], [3, -1.2], [-3.4, 3.3], [3.4, 3.3], [0, -3.4]] });
    const metal = s.material('#8faaa8', { metalness: 0.25 }), white = s.material('#d5e0d6'), dark = s.material('#7d9292'), line = s.material('#b1c1b4');
    const ticks = 4 + Math.round(a.grid * 12); for (let i = 0; i <= ticks; i++) { const x = (i / ticks - 0.5) * 14; s.box([0.015, 0.012, a.grid > 0.3 ? 9.8 : 0.3], [x, 0.009, a.grid > 0.3 ? 0 : 4.9], line); } if (a.grid > 0.3) for (let i = 0; i < 10; i++) s.box([14, 0.012, 0.015], [0, 0.011, i - 4.5], line);
    if (a.containment === 'hood') { for (const x of [-7, 7]) s.box([0.13, 5.7, 0.13], [x, 2.85, -4.8], metal); s.box([14.1, 0.2, 1], [0, 5.7, -4.8], white); s.box([14, 4.5, 0.06], [0, 2.3, -5], white); }
    if (a.containment === 'petri') { const rim = s.ring(6.6, 0.07, [0, 0.13, 0], metal); rim.rotation.x = Math.PI / 2; rim.scale.y = 0.72; }
    const board = s.box([4.7, 2.3, 0.08], [-0.5, 1.85, -4.95], white);
    if (a.diagram === 'bases') { s.label('A - T   G - C', 3.5, 0.35, [-0.5, 2.5, -4.89], '#779490', '#d5e0d6'); for (let i = 0; i < 6; i++) { const x = -2 + i * 0.6; s.rod([x, 1.2, -4.85], [x, 2.15, -4.85], 0.025, metal); s.ball([0.1, 0.1, 0.04], [x, 1.35 + i % 2 * 0.55, -4.81], s.material(i % 2 ? '#b6a98a' : '#9cb294'), 10); } }
    else if (a.diagram === 'lattice') for (let row = 0; row < 3; row++) for (let col = 0; col < 6; col++) { const x = -2 + col * 0.6, y = 1.15 + row * 0.6; s.ball([0.055, 0.055, 0.025], [x, y, -4.87], dark, 8); if (col < 5) s.rod([x, y, -4.87], [x + 0.6, y, -4.87], 0.014, metal); if (row < 2) s.rod([x, y, -4.87], [x, y + 0.6, -4.87], 0.014, metal); }
    else for (let i = 0; i < 7; i++) { const t = i * 2.4; s.ring(0.24 + i % 3 * 0.07, 0.025, [-0.5 + Math.cos(t) * 1.1, 1.8 + Math.sin(t) * 0.6, -4.87], metal); }
    if (a.instrument === 'microscope') { const x = 5.8, z = -4.3; s.box([1.45, 0.2, 1.1], [x, 0.1, z], metal); s.tube([[x - 0.3, 0.2, z], [x - 0.4, 1.4, z], [x + 0.15, 2, z]], 0.14, metal); s.box([0.95, 0.07, 0.8], [x + 0.25, 0.85, z], dark); s.rod([x + 0.15, 1.3, z], [x + 0.35, 2.25, z], 0.11, white); s.rod([x + 0.35, 2.25, z], [x + 0.5, 2.65, z], 0.075, dark); s.cylinder(0.14, 0.14, 0.05, [x - 0.45, 1.4, z + 0.17], dark).rotation.x = Math.PI / 2; }
    else if (a.instrument === 'pipettes') { s.box([2.3, 0.14, 0.9], [5.4, 0.1, -4.3], metal); for (let i = 0; i < 6; i++) { const x = 4.5 + i * 0.35; s.cylinder(0.035, 0.08, 1.25, [x, 0.78, -4.3], white, 12); s.cylinder(0.09, 0.09, 0.13, [x, 1.45, -4.3], s.material(i % 2 ? '#a7b797' : '#b9a58f'), 12); } }
    else { s.box([2.3, 1.1, 1.6], [5.5, 0.55, -4.3], white); s.label('SPECTRUM', 1.6, 0.28, [5.5, 0.82, -3.49], '#73958d', '#bdcdc5'); for (let i = 0; i < 5; i++) s.box([0.11, 0.13 + i * 0.05, 0.035], [4.9 + i * 0.3, 0.32, -3.47], metal); }
    if (a.glassware) { const glass = s.material('#b8d0c9', { roughness: 0.22 }); for (let i = 0; i < 4; i++) { const x = -6 + i * 0.42, z = -3.5 + i % 2 * 0.6; s.lathe([[0.22, 0], [0.28, 0.05], [0.28, 0.3], [0.1, 0.6], [0.1, 0.9], [0.075, 0.9], [0.075, 0.58], [0, 0.3]], glass, [x, 0.02, z]); s.cylinder(0.21, 0.23, 0.15, [x, 0.15, z], s.material(i % 2 ? '#b8bf93' : '#9fbbbc'), 16); } }
    if (a.labels) { const one = s.label('SPECIMEN 01', 1.5, 0.22, [-4.8, 0.08, 4.5]); one.rotation.x = -Math.PI / 2; const two = s.label('BOTANICAL STUDY', 2, 0.22, [4.4, 0.08, 4.5]); two.rotation.x = -Math.PI / 2; }
    if (a.scale) { s.box([0.3, 4.3, 0.06], [-6.7, 2.15, -4.8], white); for (let i = 0; i < 20; i++) s.box([i % 5 ? 0.13 : 0.25, 0.015, 0.03], [-6.7, 0.2 + i * 0.2, -4.75], dark); }
    board.castShadow = false;
    return world;
  },
});
