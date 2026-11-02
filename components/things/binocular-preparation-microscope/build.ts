import * as THREE from 'three';
import { Sculpture, choice, defineThing, noul, score } from '@conjure/kit';

export default defineThing({
  questions: {
    stand: choice('What kind of microscope stand supports the head?', { pillar: 'A compact vertical pillar rising from a broad base.', boom: 'A long horizontal boom reaches over a wide working area.', horseshoe: 'A heavy old horseshoe foot and curved arm.', field: 'A folding tripod field stand.' }),
    body: choice('What is the microscope housing like?', { cream: 'Cream enamel and black eyepieces.', green: 'Dark green old laboratory enamel.', grey: 'Pale grey modern polymer and black grips.', brass: 'Brass fittings and dark lacquered metal.' }),
    separation: score('How widely are the paired eyepieces spaced?', ['Close set eyepieces', 'Normal binocular separation', 'Wide outward angled eyepieces']),
    focus: score('How high is the objective above the stage?', ['Low over a flat specimen', 'A hand fits underneath', 'Raised for a bulky fossil']),
    objective: choice('What objective arrangement is fitted?', { single: 'One broad circular stereo objective.', turret: 'A rotating turret with three short objectives.', long: 'A long narrow working distance nose.', shield: 'A broad nose behind a clear protective guard.' }),
    stage: choice('What is the specimen stage made of?', { black: 'A black circular contrast plate.', white: 'A white circular enamel plate.', glass: 'A frosted glass transmitted light plate.', cork: 'A warm cork pad for uneven fossils.' }),
    lighting: choice('How is the specimen illuminated?', { ring: 'A luminous ring around the objective.', twin: 'Two flexible lamp arms reach in from the sides.', back: 'A glowing transmitted light plate.', daylight: 'Only ambient light, with no lamp attachments.' }),
    specimen: choice('What work is under the microscope?', { shell: 'One pale coiled shell on the stage.', slide: 'A glass slide held by two clips.', rock: 'An irregular small stone waiting for preparation.', empty: 'The stage is empty between specimens.' }),
    camera: noul('Is a camera tube fitted above the binocular head?'),
  },
  build(a, context) {
    const s = new Sculpture(context), rnd = context.random;
    const paint = s.material({ cream: '#d8d2b4', green: '#416052', grey: '#b4bec0', brass: '#a58a47' }[a.body], { metalness: a.body === 'brass' ? 0.65 : 0.18 });
    const black = s.material('#28302d'), metal = s.material('#a9b0ac', { metalness: 0.78, roughness: 0.28 }), glass = s.material('#9abec0', { transparent: true, opacity: 0.28, depthWrite: false });
    const light = s.material('#f6edca', { emissive: '#f7e6b2', emissiveIntensity: 0.3 + context.mood.daylight * 0.3 });
    const base = a.stand === 'boom' ? 0.36 : 0.25, zcol = -0.105;
    if (a.stand === 'field') for (let i = 0; i < 3; i++) { const t = i / 3 * Math.PI * 2; s.rod([0, 0.16, zcol], [Math.sin(t) * 0.15, 0.012, zcol + Math.cos(t) * 0.15], 0.012, metal); s.ball([0.018, 0.012, 0.018], [Math.sin(t) * 0.15, 0.01, zcol + Math.cos(t) * 0.15], black, 10); }
    else if (a.stand === 'horseshoe') { s.tube([[-0.115, 0.025, 0.1], [-0.13, 0.025, -0.07], [0, 0.025, -0.13], [0.13, 0.025, -0.07], [0.115, 0.025, 0.1]], 0.025, paint); }
    else s.box([base, 0.035, 0.26], [0, 0.0175, 0], paint);
    const headY = 0.23 + a.focus * 0.12;
    s.rod([0, 0.03, zcol], [0, headY + 0.08, zcol], 0.018, metal);
    const headX = a.stand === 'boom' ? 0.11 : 0;
    s.rod([0, headY, zcol], [headX, headY, 0.035], 0.023, paint);
    s.box([0.075, 0.075, 0.09], [headX, headY, 0.03], paint);
    for (const x of [-1, 1]) { const knob = s.cylinder(0.027, 0.027, 0.018, [headX + x * 0.052, headY, 0.01], black); knob.rotation.z = Math.PI / 2; for (let k = 0; k < 9; k++) { const t = k / 9 * Math.PI * 2; s.ball([0.003, 0.003, 0.003], [headX + x * 0.062, headY + Math.sin(t) * 0.025, 0.01 + Math.cos(t) * 0.025], metal, 6); } }
    const eyeSep = 0.025 + a.separation * 0.035;
    for (const sign of [-1, 1]) { const start: [number, number, number] = [headX + sign * 0.018, headY + 0.028, 0.04], end: [number, number, number] = [headX + sign * eyeSep, headY + 0.11, 0.105]; s.rod(start, end, 0.018, paint); s.rod(end, [end[0], end[1] + 0.018, end[2] + 0.015], 0.02, black); s.ball([0.015, 0.005, 0.014], [end[0], end[1] + 0.021, end[2] + 0.018], glass, 12); }
    const noseY = headY - 0.07;
    s.cylinder(0.028, a.objective === 'long' ? 0.013 : 0.034, a.objective === 'long' ? 0.09 : 0.05, [headX, noseY, 0.05], black);
    if (a.objective === 'turret') { s.cylinder(0.047, 0.047, 0.01, [headX, noseY + 0.015, 0.05], metal); for (let i = 0; i < 3; i++) { const t = i / 3 * Math.PI * 2; s.cylinder(0.011, 0.009, 0.04, [headX + Math.sin(t) * 0.03, noseY - 0.01, 0.05 + Math.cos(t) * 0.03], metal); } }
    if (a.objective === 'shield') s.box([0.1, 0.075, 0.004], [headX, noseY - 0.025, 0.09], glass);
    s.cylinder(0.075, 0.075, 0.008, [headX, 0.044, 0.05], a.lighting === 'back' ? light : s.material({ black: '#29332c', white: '#e4e4d4', glass: '#b3cdd0', cork: '#a99366' }[a.stage]));
    if (a.lighting === 'ring') s.ring(0.033, 0.007, [headX, noseY - 0.027, 0.05], light).rotation.x = Math.PI / 2;
    if (a.lighting === 'twin') for (const sign of [-1, 1]) { s.tube([[sign * 0.11, 0.04, -0.06], [sign * 0.14, 0.14, -0.02], [headX + sign * 0.065, 0.15, 0.07]], 0.007, black); s.ball([0.014, 0.018, 0.014], [headX + sign * 0.065, 0.14, 0.07], light, 12); }
    if (a.specimen === 'rock') { const rock = s.mesh(new THREE.DodecahedronGeometry(0.035, 0), s.material('#a58d67'), [headX, 0.065, 0.05]); rock.scale.y = 0.6; rock.rotation.y = rnd(); }
    if (a.specimen === 'slide') { s.box([0.095, 0.003, 0.035], [headX, 0.052, 0.05], glass); for (const x of [-0.045, 0.045]) s.box([0.008, 0.004, 0.05], [headX + x, 0.055, 0.05], metal); }
    if (a.specimen === 'shell') { const p: [number, number, number][] = []; for (let j = 0; j < 40; j++) { const t = j * 0.35, r = j * 0.00055; p.push([headX + Math.cos(t) * r, 0.057, 0.05 + Math.sin(t) * r]); } s.tube(p, 0.003, s.material('#d2bc8d')); }
    if (a.camera) { s.cylinder(0.019, 0.019, 0.09, [headX, headY + 0.09, 0.015], black); s.box([0.065, 0.045, 0.045], [headX, headY + 0.15, 0.015], paint); s.tube([[headX + 0.03, headY + 0.15, 0.015], [0.15, headY + 0.12, -0.09], [0.15, 0.006, -0.14]], 0.002, black); }
    return s.finish();
  },
});
