import * as THREE from 'three';
import { Sculpture, choice, defineThing, noul, score } from '@conjure/kit';

export default defineThing({
  questions: {
    vessel: choice('What holds the germination trial?', { cells: 'A deep divided propagation tray.', dishes: 'Six circular shallow laboratory dishes in a carrier.', paper: 'Folded wet-paper test strips in an open tray.', plugs: 'A grid of dark compressed growing plugs.' }),
    plant: choice('What is germinating?', { bean: 'Large beans with paired fleshy leaves.', cress: 'A carpet of fine cress stems.', sunflower: 'Sunflower seeds with a striped shell and broad first leaves.', conifer: 'Tiny conifer seedlings with star-shaped needle crowns.' }),
    stage: choice('What has the trial revealed?', { waiting: 'Unsprouted seeds laid in counted rows.', roots: 'Pale roots just curling from the seed coats.', shoots: 'Upright green shoots carry their first leaves.', failed: 'One compartment is healthy but the others failed to germinate.' }),
    cover: choice('Where is the clear humidity cover?', { off: 'The cover is removed and lying beside the tray.', closed: 'A clear domed cover encloses the trial.', ajar: 'The cover is propped open at one end.', absent: 'An open test without a cover.' }),
    divisions: choice('How is the experiment divided?', { two: 'Two broad comparison groups.', six: 'Six labelled experimental cells.', twelve: 'Twelve narrow repeated sample cells.', control: 'Four large cells and a separate control strip.' }),
    growth: score('How far have the seedlings grown?', ['Just breaking the seed coat', 'Short upright stems', 'A thick leaning canopy']),
    labels: noul('Are upright date and accession markers present?'),
    pipette: noul('Is a watering pipette resting on the rim?'),
  },
  build(a, context) {
    const s = new Sculpture(context), { random, mood } = context;
    const green = s.material('#5c7b40'), pale = s.material('#c5c9a2'), soil = s.material('#574431'), tray = s.material('#556563'), paper = s.material('#e1dfc8');
    const w = 0.68, d = 0.46;
    s.box([w, 0.026, d], [0, 0.013, 0], tray);
    for (const x of [-w / 2, w / 2]) s.box([0.018, 0.075, d], [x, 0.04, 0], tray);
    for (const z of [-d / 2, d / 2]) s.box([w, 0.075, 0.018], [0, 0.04, z], tray);
    const nx = { two: 2, six: 3, twelve: 4, control: 2 }[a.divisions], nz = a.divisions === 'two' ? 1 : a.divisions === 'twelve' ? 3 : 2;
    const cw = (w - 0.04) / nx, cd = (d - 0.04) / nz;
    for (let ix = 0; ix < nx; ix++) for (let iz = 0; iz < nz; iz++) {
      const x = (ix - (nx - 1) / 2) * cw, z = (iz - (nz - 1) / 2) * cd;
      if (a.vessel === 'dishes') { const r = Math.min(cw, cd) * 0.43; s.cylinder(r, r, 0.02, [x, 0.038, z], paper, 24); s.ring(r, 0.005, [x, 0.052, z], tray).rotation.x = Math.PI / 2; }
      else { s.box([cw - 0.012, 0.025, cd - 0.012], [x, 0.04, z], a.vessel === 'plugs' ? soil : paper); if (a.vessel === 'cells') { s.box([0.009, 0.07, cd], [x + cw / 2, 0.055, z], tray); s.box([cw, 0.07, 0.009], [x, 0.055, z + cd / 2], tray); } }
      const rows = a.plant === 'cress' ? 4 : 2;
      for (let i = 0; i < rows * 2; i++) {
        const px = x + ((i % 2) - 0.5) * cw * 0.42 + (random() - 0.5) * 0.012, pz = z + (Math.floor(i / 2) / Math.max(1, rows - 1) - 0.5) * cd * 0.52;
        const seedMat = s.material(a.plant === 'sunflower' ? '#474234' : a.plant === 'bean' ? '#ad8961' : '#86714b');
        s.ball([a.plant === 'bean' ? 0.015 : 0.007, 0.007, 0.011], [px, 0.064, pz], seedMat, 8);
        const live = a.stage !== 'waiting' && (a.stage !== 'failed' || ix === 0 && iz === 0);
        if (!live) continue;
        if (a.stage === 'roots') { s.tube([[px, 0.067, pz], [px + 0.015, 0.062, pz + 0.02], [px + 0.027, 0.063, pz + 0.007]], 0.003, pale); continue; }
        const h = (0.03 + a.growth * 0.15) * (0.8 + random() * 0.4), bend = (random() - 0.5) * h * 0.3;
        s.rod([px, 0.064, pz], [px + bend, 0.064 + h, pz], 0.0025, pale);
        const leaves = a.plant === 'conifer' ? 5 : 2;
        for (let j = 0; j < leaves; j++) {
          const angle = j / leaves * Math.PI * 2 + ix, lr = a.plant === 'cress' ? 0.008 : a.plant === 'conifer' ? 0.003 : 0.016;
          const leaf = s.ball([lr, 0.0025, a.plant === 'conifer' ? 0.028 : 0.026], [px + bend + Math.sin(angle) * 0.017, 0.064 + h, pz + Math.cos(angle) * 0.017], green, 8); leaf.rotation.y = angle; leaf.rotation.x = 0.15 + mood.energy * 0.15;
        }
      }
      if (a.labels) { s.box([0.01, 0.12, 0.006], [x - cw * 0.3, 0.11, z - cd * 0.25], paper); s.label(`${ix + 1}${String.fromCharCode(65 + iz)}`, 0.045, 0.025, [x - cw * 0.3, 0.165, z - cd * 0.25 + 0.004]); }
    }
    if (a.divisions === 'control') { s.box([w * 0.7, 0.025, 0.055], [0, 0.02, d / 2 + 0.075], paper); s.label('CONTROL', w * 0.45, 0.025, [0, 0.036, d / 2 + 0.075]).rotation.x = -Math.PI / 2; }
    if (a.cover !== 'absent') {
      const clear = s.material('#d7e3d7', { transparent: true, opacity: 0.18, depthWrite: false, side: THREE.DoubleSide, roughness: 0.15 });
      const cover = new THREE.Group();
      const shell = s.surface((u, v, p) => { const theta = u * Math.PI; p.set((v - 0.5) * (w + 0.04), Math.sin(theta) * 0.2, Math.cos(theta) * (d + 0.04) / 2); }, clear, { segments: [18, 2] }); cover.add(shell);
      for (const x of [-w / 2 - 0.02, w / 2 + 0.02]) { const rim = s.tube(Array.from({ length: 11 }, (_, i) => [x, Math.sin(i / 10 * Math.PI) * 0.2, Math.cos(i / 10 * Math.PI) * (d + 0.04) / 2] as [number, number, number]), 0.006, tray); cover.add(rim); }
      cover.position.set(a.cover === 'off' ? w + 0.07 : 0, a.cover === 'ajar' ? 0.12 : a.cover === 'off' ? 0.005 : 0.08, 0); if (a.cover === 'ajar') cover.rotation.z = 0.22; s.root.add(cover);
    }
    if (a.pipette) { s.rod([-0.23, 0.105, d / 2], [0.19, 0.105, d / 2], 0.009, pale, 0.003); s.ball([0.04, 0.02, 0.02], [-0.23, 0.105, d / 2], s.material('#9a6755'), 10); }
    return s.finish();
  },
});
