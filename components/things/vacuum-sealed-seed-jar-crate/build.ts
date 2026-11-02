import * as THREE from 'three';
import { Sculpture, choice, defineThing, noul, score } from '@conjure/kit';

export default defineThing({
  questions: {
    crate: choice('What carries the seed jars?', { slatted: 'A slatted wooden carrying crate.', field: 'A green field case with metal corner guards.', archive: 'An archival cardboard box with dividers.', wire: 'A wire laboratory bottle carrier.' }),
    closure: choice('How are the jars sealed?', { clamp: 'Wire-bail lids with rubber gaskets.', screw: 'Wide ribbed metal screw lids.', wax: 'Cloth caps sealed with dark wax.', foil: 'Bright silver foil seals under protective caps.' }),
    seed: choice('Which seeds fill the jars?', { beans: 'Large reddish heirloom beans.', corn: 'Golden corn kernels.', flowers: 'Fine black wildflower seeds.', acorns: 'Large brown acorns with pale caps.' }),
    fill: score('How full are the seed jars?', ['Precious few at the bottom', 'Half-full harvest jars', 'Filled almost to the seals']),
    state: choice('What story does the crate tell?', { transport: 'All jars sealed and secured for travel.', inspection: 'One jar has been removed for inspection.', rescue: 'One place is empty and a rescued cutting rests across it.', donation: 'Small handwritten donation tags cover the jars.' }),
    count: choice('How many jars fit the crate?', { four: 'Four large jars in a square.', six: 'Six jars in two rows.', nine: 'Nine small jars tightly arranged.', pair: 'Two broad sample jars.' }),
    moisture: noul('Do blue moisture indicator sachets sit with the jars?'),
    handle: noul('Does a high carrying handle arch over the crate?'),
  },
  build(a, context) {
    const s = new Sculpture(context), { random, mood } = context;
    const wood = s.material({ slatted: '#a38459', field: '#547567', archive: '#bdab85', wire: '#929c96' }[a.crate], { metalness: a.crate === 'wire' ? 0.6 : 0.02 });
    const dark = s.material('#65523d'), metal = s.material('#aeb3a9', { metalness: 0.75, roughness: 0.3 }), glass = s.material('#c5d8c7', { transparent: true, opacity: 0.2, depthWrite: false, roughness: 0.12 });
    const nx = a.count === 'six' || a.count === 'nine' ? 3 : 2, nz = a.count === 'pair' ? 1 : a.count === 'nine' ? 3 : 2;
    const pitch = 0.21, w = nx * pitch + 0.04, d = nz * pitch + 0.04;
    s.box([w, 0.025, d], [0, 0.013, 0], wood);
    for (const x of [-w / 2, w / 2]) for (const z of [-d / 2, d / 2]) s.box([0.027, 0.27, 0.027], [x, 0.135, z], wood);
    if (a.crate === 'archive') {
      for (const z of [-d / 2, d / 2]) s.box([w, 0.26, 0.018], [0, 0.14, z], wood);
      for (const x of [-w / 2, w / 2]) s.box([0.018, 0.26, d], [x, 0.14, 0], wood);
      const flap = s.box([w, 0.009, d * 0.5], [0, 0.27 + d * 0.25 * Math.sin(0.38), -d / 2 - d * 0.25 * Math.cos(0.38)], wood); flap.rotation.x = 0.38;
      s.label('SEED ARCHIVE', w * 0.8, 0.08, [0, 0.16, d / 2 + 0.011]);
    } else for (let i = 0; i < 3; i++) {
      for (const z of [-d / 2, d / 2]) s.box([w, a.crate === 'wire' ? 0.009 : 0.055, 0.018], [0, 0.055 + i * 0.085, z], wood);
      for (const x of [-w / 2, w / 2]) s.box([0.018, a.crate === 'wire' ? 0.009 : 0.055, d], [x, 0.055 + i * 0.085, 0], wood);
    }
    for (let i = 1; i < nx; i++) s.box([0.009, 0.2, d - 0.02], [(i - nx / 2) * pitch, 0.125, 0], dark);
    for (let i = 1; i < nz; i++) s.box([w - 0.02, 0.2, 0.009], [0, 0.125, (i - nz / 2) * pitch], dark);
    const seed = s.material({ beans: '#946348', corn: '#d9ad53', flowers: '#4c4538', acorns: '#927144' }[a.seed]);
    for (let iz = 0; iz < nz; iz++) for (let ix = 0; ix < nx; ix++) {
      const moved = ix === nx - 1 && iz === nz - 1 && a.state === 'inspection';
      if (ix === nx - 1 && iz === nz - 1 && a.state === 'rescue') continue;
      const x = moved ? w / 2 + 0.16 : (ix - (nx - 1) / 2) * pitch, z = moved ? 0.12 : (iz - (nz - 1) / 2) * pitch, base = moved ? 0 : 0.027;
      const r = 0.084, h = 0.3;
      s.lathe([[0, 0], [r, 0], [r, h * 0.8], [r * 0.72, h], [r * 0.72, h + 0.025], [r * 0.63, h + 0.025], [r * 0.63, h], [r * 0.9, h * 0.79], [r * 0.9, 0.012], [0, 0.012]], glass, [x, base, z]);
      const fh = 0.018 + a.fill * 0.205;
      s.cylinder(r * 0.83, r * 0.83, fh, [x, base + 0.015 + fh / 2, z], seed, 20);
      for (let i = 0; i < 13; i++) { const theta = random() * Math.PI * 2, rad = Math.sqrt(random()) * r * 0.7; s.ball(a.seed === 'acorns' ? [0.013, 0.012, 0.019] : [0.008, 0.006, 0.011], [x + Math.sin(theta) * rad, base + fh + 0.024, z + Math.cos(theta) * rad], seed, 8); }
      const lidMat = a.closure === 'wax' ? s.material('#71524a') : metal;
      s.cylinder(r * 0.8, r * 0.8, 0.035, [x, base + h + 0.04, z], lidMat, 24);
      if (a.closure === 'clamp') { s.tube([[x - r * 0.9, base + h - 0.07, z], [x - r * 0.85, base + h + 0.07, z], [x + r * 0.85, base + h + 0.07, z], [x + r * 0.9, base + h - 0.07, z]], 0.0035, metal); s.ring(r * 0.77, 0.004, [x, base + h + 0.015, z], dark).rotation.x = Math.PI / 2; }
      if (a.closure === 'screw') for (let j = 0; j < 16; j++) { const theta = j / 16 * Math.PI * 2; s.rod([x + Math.sin(theta) * r * 0.81, base + h + 0.03, z + Math.cos(theta) * r * 0.81], [x + Math.sin(theta) * r * 0.81, base + h + 0.05, z + Math.cos(theta) * r * 0.81], 0.002, metal); }
      if (a.closure === 'foil') s.ring(r * 0.8, 0.006, [x, base + h + 0.017, z], metal).rotation.x = Math.PI / 2;
      s.label(a.state === 'donation' ? 'THANK YOU' : `SEED ${11 + ix + iz * nx}`, 0.115, 0.07, [x, base + 0.16, z + r + 0.001], '#3f4c3e', '#e5ddbd');
    }
    if (a.state === 'rescue') { s.rod([-w * 0.2, 0.29, -d * 0.2], [w * 0.4, 0.34, d * 0.35], 0.006, s.material('#637347')); for (let i = 0; i < 5; i++) s.ball([0.035, 0.006, 0.06], [-w * 0.1 + i * 0.065, 0.31, -d * 0.1 + i * 0.05], s.material('#78884e'), 10).rotation.y = i % 2 ? 0.8 : -0.8; }
    if (a.moisture) for (const x of [-w * 0.25, w * 0.25]) { s.box([0.065, 0.013, 0.09], [x, 0.275, d * 0.35], s.material('#a0bdc1')); s.label('DRY', 0.05, 0.027, [x, 0.283, d * 0.35]).rotation.x = -Math.PI / 2; }
    if (a.handle) s.tube([[-w / 2, 0.22, 0], [-w / 2, 0.53, 0], [0, 0.61, 0], [w / 2, 0.53, 0], [w / 2, 0.22, 0]], 0.014, dark);
    if (a.crate === 'field') for (const x of [-w / 2, w / 2]) for (const z of [-d / 2, d / 2]) s.box([0.045, 0.08, 0.045], [x, 0.045, z], metal);
    return s.finish();
  },
});
