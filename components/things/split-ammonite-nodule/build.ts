import * as THREE from 'three';
import { Sculpture, choice, defineThing, noul, score } from '@conjure/kit';

export default defineThing({
  questions: {
    opening: choice('How has the fossil nodule been opened?', { pair: 'Matching halves lie side by side like an open book.', single: 'Only the positive fossil half remains.', offset: 'The halves are offset, one turned away from its counterpart.', stacked: 'One half leans on its matching half.' }),
    coil: choice('What is the ammonite coil like?', { tight: 'A tight round spiral with many close whorls.', open: 'A broad loose coil with a wide final chamber.', hooked: 'The final chamber uncoils into a hook.', twin: 'Two smaller ammonites share one nodule.' }),
    mineral: choice('What replaced the shell?', { honey: 'Honey calcite in a pale limestone bed.', pyrite: 'Brassy pyrite in dark grey shale.', iron: 'Rust red mineral against warm sandstone.', ivory: 'Ivory shell against a brown clay nodule.' }),
    relief: score('How deeply does the shell stand above the matrix?', ['Nearly a flat impression', 'Fine exposed ridges', 'A high shell standing free']),
    chambers: score('How many chamber divisions are exposed?', ['A few broad chambers', 'Regular close septa', 'A lace of closely spaced chambers']),
    matrix: choice('What remains around the fossil?', { round: 'A complete round nodule rind.', jagged: 'A chipped irregular margin.', trimmed: 'A straight trimmed study slab.', fragment: 'Only a narrow matrix fragment remains.' }),
    support: choice('How is the specimen presented?', { bare: 'The halves lie directly on the work surface.', sand: 'A low sand cushion steadies the halves.', felt: 'A dark green padded display board.', blocks: 'Two small wooden wedges tilt the halves toward the viewer.' }),
    repaired: noul('Is a pale repaired fracture visible across one shell?'),
    tag: noul('Is an accession tag tied beside the specimen?'),
  },
  build(a, context) {
    const s = new Sculpture(context), rnd = context.random;
    const palettes = { honey: ['#b5a284', '#dbb75b'], pyrite: ['#666a6b', '#a58b42'], iron: ['#b5a08a', '#b75631'], ivory: ['#927e66', '#e5d8b8'] } as const;
    const [rockColour, shellColour] = palettes[a.mineral];
    const rock = s.material(rockColour), shell = s.material(shellColour, { metalness: a.mineral === 'pyrite' ? 0.66 : 0.08, roughness: 0.45 });
    const dark = s.material('#564b39'), pale = s.material('#e4dac7');
    const count = a.opening === 'single' ? 1 : 2;
    const top = 0.035 + (a.support === 'bare' ? 0 : 0.025);
    if (a.support === 'felt') s.box([0.58, 0.022, 0.33], [0, 0.011, 0], s.material('#354f46'));
    if (a.support === 'sand') s.ball([0.3, 0.025, 0.18], [0, 0.014, 0], s.material('#c3b18b'));
    for (let side = 0; side < count; side++) {
      const cx = count === 1 ? 0 : (side - 0.5) * 0.285;
      const cz = a.opening === 'offset' ? (side - 0.5) * 0.12 : 0;
      const lift = a.opening === 'stacked' && side === 1 ? 0.055 : 0;
      if (a.support === 'blocks') s.box([0.2, 0.025, 0.12], [cx, 0.0125, cz], s.material('#92744a'));
      const group = new THREE.Group();
      const start = s.root.children.length;
      const radius = a.matrix === 'fragment' ? 0.11 : 0.14;
      if (a.matrix === 'trimmed') s.box([0.265, 0.045, 0.27], [cx, top + lift, cz], rock);
      else {
        s.cylinder(radius, radius * 0.87, 0.048, [cx, top + lift, cz], rock, a.matrix === 'jagged' ? 9 : 24);
        if (a.matrix === 'jagged') for (let j = 0; j < 8; j++) { const t = j * Math.PI / 4; s.ball([0.028, 0.022, 0.021], [cx + Math.sin(t) * 0.12, top + lift - 0.003, cz + Math.cos(t) * 0.12], rock, 8); }
      }
      const y = top + lift + 0.028, models = a.coil === 'twin' ? 2 : 1;
      for (let f = 0; f < models; f++) {
        const ox = models === 2 ? (f - 0.5) * 0.12 : 0, scale = models === 2 ? 0.56 : 1;
        const turns = a.coil === 'tight' ? 3.1 : 2.2, steps = 86;
        const path: [number, number, number][] = [];
        for (let i = 0; i <= steps; i++) {
          const q = i / steps, t = q * turns * Math.PI * 2, r = (0.008 + 0.094 * q * q) * scale;
          const hook = a.coil === 'hooked' && q > 0.88 ? (q - 0.88) * 0.22 : 0;
          path.push([cx + ox + Math.cos(t) * r + hook, y + 0.006 + a.relief * 0.012, cz + Math.sin(t) * r]);
        }
        s.tube(path, (0.0035 + a.relief * 0.009) * scale, side === 1 ? dark : shell);
        const n = 12 + Math.round(a.chambers * 26);
        for (let k = 0; k < n; k++) {
          const q = 0.2 + 0.8 * k / n, t = q * turns * Math.PI * 2, r = (0.008 + 0.094 * q * q) * scale;
          const band = (0.008 + 0.009 * q) * scale;
          s.rod([cx + ox + Math.cos(t) * (r - band), y + 0.009 + a.relief * 0.012, cz + Math.sin(t) * (r - band)], [cx + ox + Math.cos(t) * (r + band), y + 0.009 + a.relief * 0.012, cz + Math.sin(t) * (r + band)], 0.0018 * scale, side === 1 ? shell : dark);
        }
      }
      if (a.repaired && side === 0) s.tube([[cx - 0.11, y + 0.012, cz - 0.03], [cx - 0.02, y + 0.024, cz], [cx + 0.06, y + 0.018, cz + 0.01], [cx + 0.12, y + 0.008, cz + 0.04]], 0.0022, pale);
      for (let j = 0; j < 7 + Math.round(context.mood.wear * 10); j++) { const t = rnd() * Math.PI * 2; s.ball([0.006, 0.002, 0.005], [cx + Math.cos(t) * 0.12, y - 0.003, cz + Math.sin(t) * 0.12], dark, 6); }
      if (a.opening === 'stacked' && side === 1) {
        const children = s.root.children.slice(start);
        s.root.add(group); group.position.set(cx, top + lift, cz);
        for (const child of children) { child.position.sub(group.position); group.add(child); }
        group.rotation.x = 0.28;
      }
    }
    if (a.tag) { const tag = s.label('AMM / 042', 0.11, 0.04, [0.05, 0.003, 0.2], '#403a2a', '#e9ddba'); tag.rotation.x = -Math.PI / 2; s.tube([[0.02, 0.005, 0.18], [-0.03, 0.01, 0.16], [-0.02, top, 0.11]], 0.001, dark); }
    return s.finish();
  },
});
