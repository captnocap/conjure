import * as THREE from 'three';
import { Sculpture, choice, defineThing, noul, score } from '@conjure/kit';

export default defineThing({
  questions: {
    grid: choice('How is the picking tray divided?', { coarse: 'Four broad compartments for a first sort.', medium: 'A four by four grid for a reference collection.', fine: 'A six by six grid of tiny numbered wells.', rows: 'Long narrow channels separate successive sediment layers.' }),
    backing: choice('What lies beneath the fossils?', { black: 'Black velvet makes pale shells stand out.', white: 'White enamel shows dark grains clearly.', blue: 'Pale blue paper lined wells.', cork: 'Warm brown cork in a wooden field tray.' }),
    specimens: choice('Which microfossils dominate the tray?', { coils: 'Tiny cream spiral shells.', teeth: 'Dark triangular fish teeth.', needles: 'Slender pale sponge spicules.', mixed: 'A mixture of shell discs, teeth and fine grains.' }),
    filling: score('How far has the sort progressed?', ['Just a few occupied wells', 'Half the grid contains picked samples', 'Every well holds specimens']),
    order: choice('How have specimens been arranged?', { ranked: 'A neat increasing size series.', scattered: 'Each well holds an irregular little cluster.', singled: 'One carefully chosen specimen per occupied well.', compare: 'Paired specimens for comparison.' }),
    cover: choice('Where is the clear lid?', { absent: 'No lid, ready for active work.', open: 'A clear lid stands open behind the tray.', closed: 'A transparent protective lid covers the grid.', aside: 'The lid lies alongside the tray.' }),
    picker: choice('Which picking tool rests beside it?', { needle: 'A thin wooden handle with one picking needle.', brush: 'A tiny pointed watercolour brush.', pipette: 'A rubber bulb glass pipette.', tweezers: 'Fine steel forceps.' }),
    magnifier: noul('Does a folding hand lens sit on the tray corner?'),
    records: noul('Is a pencilled sample log tucked under the tray?'),
  },
  build(a, context) {
    const s = new Sculpture(context), rnd = context.random;
    const nx = { coarse: 2, medium: 4, fine: 6, rows: 5 }[a.grid], nz = a.grid === 'rows' ? 1 : nx;
    const w = 0.3, d = 0.24, rim = s.material('#a08b64'), steel = s.material('#9ca5a3', { metalness: 0.65 });
    const paper = s.material({ black: '#2c302b', white: '#e5e3d6', blue: '#a6c5cc', cork: '#a3865b' }[a.backing]);
    const ivory = s.material('#e0d2a7'), tooth = s.material('#625240'), grain = s.material('#b7a37c');
    s.box([w, 0.012, d], [0, 0.006, 0], rim); s.box([w - 0.016, 0.003, d - 0.016], [0, 0.014, 0], paper);
    for (let i = 0; i <= nx; i++) s.box([0.004, 0.022, d], [-w / 2 + i * w / nx, 0.023, 0], rim);
    for (let j = 0; j <= nz; j++) s.box([w, 0.022, 0.004], [0, 0.023, -d / 2 + j * d / nz], rim);
    const occupied = Math.max(1, Math.round(nx * nz * (0.06 + a.filling * 0.94)));
    for (let cell = 0; cell < occupied; cell++) {
      const x = -w / 2 + (cell % nx + 0.5) * w / nx, z = -d / 2 + (Math.floor(cell / nx) + 0.5) * d / nz;
      const count = { ranked: 3, scattered: 4, singled: 1, compare: 2 }[a.order];
      for (let k = 0; k < count; k++) {
        const px = x + (a.order === 'scattered' ? rnd() - 0.5 : (k - (count - 1) / 2) / Math.max(count, 2)) * w / nx * 0.62;
        const pz = z + (a.order === 'scattered' ? (rnd() - 0.5) * d / nz * 0.5 : 0);
        const radius = (a.grid === 'coarse' ? 0.013 : 0.006) * (a.order === 'ranked' ? 0.6 + k * 0.28 : 1);
        const kind = a.specimens === 'mixed' ? ['coils', 'teeth', 'needles'][cell % 3] : a.specimens;
        if (kind === 'coils') {
          s.cylinder(radius, radius * 0.8, radius * 0.55, [px, 0.018 + radius * 0.25, pz], ivory, 14);
          const spiral: [number, number, number][] = [];
          for (let j = 0; j <= 24; j++) { const t = j * 0.45, r = radius * j / 28; spiral.push([px + Math.cos(t) * r, 0.018 + radius * 0.57, pz + Math.sin(t) * r]); }
          s.mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(spiral.map(p => new THREE.Vector3(...p))), 32, radius * 0.09, 5, false), tooth);
        } else if (kind === 'teeth') { const t = s.cylinder(0, radius, radius * 2.4, [px, 0.019 + radius, pz], tooth, 3); t.rotation.z = 0.25; }
        else for (let j = 0; j < 3; j++) s.rod([px - radius, 0.02 + j * 0.001, pz + j * 0.002], [px + radius, 0.02 + j * 0.001, pz - radius + j * 0.002], radius * 0.08, ivory);
      }
      if (context.mood.density > 0.2) for (let k = 0; k < 2; k++) s.ball([0.0015, 0.001, 0.0015], [x + (rnd() - 0.5) * w / nx * 0.65, 0.018, z + (rnd() - 0.5) * d / nz * 0.6], grain, 6);
    }
    const glass = s.material('#b2d4cd', { transparent: true, opacity: 0.18, depthWrite: false });
    if (a.cover !== 'absent') {
      const lid = new THREE.Group(), z = a.cover === 'aside' ? 0 : -d / 2;
      const pane = s.box([w, 0.004, d], [0, 0, d / 2], glass); lid.add(pane);
      for (const x of [-w / 2, w / 2]) lid.add(s.box([0.004, 0.006, d], [x, 0, d / 2], steel));
      for (const rz of [0, d]) lid.add(s.box([w, 0.006, 0.004], [0, 0, rz], steel));
      lid.position.set(a.cover === 'aside' ? w + 0.025 : 0, a.cover === 'aside' ? 0.003 : 0.038, z);
      if (a.cover === 'open') lid.rotation.x = -1.15;
      s.root.add(lid);
    }
    const tz = d / 2 + 0.037;
    if (a.picker === 'tweezers') for (const sign of [-1, 1]) s.rod([-0.09, 0.008, tz], [0.075, 0.008, tz + sign * 0.009], 0.002, steel, 0.0005);
    else {
      s.rod([-0.09, 0.008, tz], [0.02, 0.008, tz], a.picker === 'pipette' ? 0.008 : 0.004, s.material(a.picker === 'pipette' ? '#303b32' : '#a16534'));
      s.rod([0.02, 0.008, tz], [0.09, 0.008, tz], a.picker === 'brush' ? 0.003 : 0.0015, a.picker === 'brush' ? tooth : steel, 0.0003);
    }
    if (a.magnifier) { s.ring(0.025, 0.003, [-0.14, 0.046, 0.1], steel).rotation.x = -Math.PI / 2; s.cylinder(0.022, 0.022, 0.001, [-0.14, 0.045, 0.1], glass); s.rod([-0.14, 0.04, 0.12], [-0.15, 0.01, 0.18], 0.005, tooth); }
    if (a.records) { const label = s.label('CORE 17 / 48 m', 0.17, 0.055, [0.06, 0.001, -0.147]); label.rotation.x = -Math.PI / 2; }
    s.label(`${nx} × ${nz} / SORT`, 0.17, 0.019, [0, 0.019, d / 2 + 0.003], '#f2e9cc', '#665641');
    return s.finish();
  },
});
