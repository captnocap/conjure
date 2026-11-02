import * as THREE from 'three';
import { Sculpture, choice, defineThing, noul, score } from '@conjure/kit';

export default defineThing({
  questions: {
    posture: choice('How is the trilobite preserved?', { stretched: 'Fully extended with its head and tail visible.', curled: 'The articulated body arches into partial enrolment.', diagonal: 'An extended specimen lies diagonally across the slab.', moulting: 'The head shield is detached beside the empty body.' }),
    form: choice('What character defines the trilobite?', { broad: 'A broad oval animal with rounded cheeks.', spiny: 'A narrow armoured animal with long rearward spines.', horseshoe: 'A great crescent head dominates the short body.', slender: 'A long narrow axis with fine side ribs.' }),
    sediment: choice('What stone holds it?', { shale: 'Dark layered shale with a charcoal fossil.', limestone: 'Pale limestone with a honey brown fossil.', redbed: 'Rust sandstone with an umber fossil.', chalk: 'Chalk white matrix and a graphite grey fossil.' }),
    exposure: score('How much preparation has revealed the animal?', ['Head and centre emerging from matrix', 'Most ribs revealed', 'Every segment and spine cleaned free']),
    segments: score('How many articulated ribs are visible?', ['Six broad ribs', 'Ten ribs', 'Sixteen fine ribs']),
    eyes: choice('How prominent are the eyes?', { low: 'Low polished eye ridges.', raised: 'Two high rounded eye turrets.', crescent: 'Long crescent eyes following the cheeks.', absent: 'A blind animal with no visible eyes.' }),
    margin: choice('How was the slab prepared?', { natural: 'A rough natural rock edge.', sawn: 'A rectangular slab with squared sides.', split: 'A stepped split revealing thin bedding planes.', island: 'A small matrix island trimmed close to the animal.' }),
    stitch: noul('Is a repaired break bridged with pale conservation fill?'),
    scaleBar: noul('Does a black and white measurement scale lie along the slab?'),
  },
  build(a, context) {
    const s = new Sculpture(context), rnd = context.random;
    const colours = { shale: ['#7a7d78', '#343c38'], limestone: ['#c8ba98', '#8a6538'], redbed: ['#b97a55', '#563e2c'], chalk: ['#e1d8c3', '#565e5c'] } as const;
    const [bed, bodyColour] = colours[a.sediment], rock = s.material(bed), body = s.material(bodyColour, { roughness: 0.58 }), edge = s.material('#c5af83');
    const w = a.margin === 'island' ? 0.21 : 0.31, d = 0.37;
    if (a.margin === 'sawn') s.box([w, 0.045, d], [0, 0.0225, 0], rock);
    else { const slab = s.mesh(new THREE.CylinderGeometry(1, 0.93, 0.045, a.margin === 'natural' ? 9 : 14), rock, [0, 0.0225, 0]); slab.scale.set(w * 0.57, 1, d * 0.56); }
    if (a.margin === 'split') for (let j = 0; j < 3; j++) s.box([w * (1 - j * 0.035), 0.004, d * (1 - j * 0.025)], [0, 0.012 + j * 0.008, 0], s.material(j % 2 ? bed : '#a99c82'));
    const fossil = new THREE.Group(), first = s.root.children.length;
    const n = 6 + Math.round(a.segments * 10), width = a.form === 'slender' ? 0.043 : a.form === 'broad' ? 0.09 : 0.065;
    for (let i = 0; i < n; i++) {
      const q = i / (n - 1), z = 0.09 - q * 0.21, arch = a.posture === 'curled' ? Math.sin(q * Math.PI) * 0.08 : 0;
      const y = 0.058 + arch, taper = 1 - q * 0.54;
      s.ball([0.017 * taper, 0.011, 0.009], [0, y + 0.004, z], body, 12);
      for (const sign of [-1, 1]) {
        const span = width * taper * (0.48 + 0.52 * a.exposure);
        s.tube([[0, y, z], [sign * span * 0.5, y - 0.003, z - 0.002], [sign * span, y - 0.009, z - 0.014]], 0.0055, body);
        if (a.form === 'spiny' && a.exposure > 0.15) s.rod([sign * span, y - 0.009, z - 0.014], [sign * (span + 0.025), y - 0.004, z - 0.05], 0.003, body, 0.0007);
      }
    }
    const headX = a.posture === 'moulting' ? 0.065 : 0, headZ = a.posture === 'moulting' ? 0.125 : 0.12;
    const hw = a.form === 'horseshoe' ? 0.095 : width * 1.05;
    s.ball([hw, 0.02, 0.043], [headX, 0.067, headZ], body, 24);
    s.ball([0.025, 0.014, 0.038], [headX, 0.085, headZ + 0.005], body, 16);
    for (const sign of [-1, 1]) {
      if (a.eyes !== 'absent') s.ball([a.eyes === 'crescent' ? 0.009 : 0.006, a.eyes === 'raised' ? 0.013 : 0.005, a.eyes === 'crescent' ? 0.02 : 0.007], [headX + sign * hw * 0.48, 0.086, headZ + 0.012], edge, 12);
      if (a.form === 'spiny' || a.form === 'horseshoe') s.rod([headX + sign * hw * 0.8, 0.065, headZ], [headX + sign * hw * 1.3, 0.056, headZ - 0.065], 0.006, body, 0.001);
    }
    s.ball([width * 0.45, 0.012, 0.027], [0, 0.055, -0.135], body, 16);
    if (a.exposure < 0.6) for (const sign of [-1, 1]) s.ball([0.027 * (1 - a.exposure), 0.014, 0.1], [sign * width * 0.8, 0.049, -0.015], rock, 12);
    if (a.stitch) s.tube([[-0.1, 0.052, -0.025], [-0.04, 0.063, -0.01], [0, 0.075, -0.018], [0.075, 0.057, -0.04]], 0.0024, s.material('#dfcda3'));
    if (a.posture === 'diagonal') { const children = s.root.children.slice(first); for (const child of children) fossil.add(child); s.root.add(fossil); fossil.rotation.y = 0.5; }
    for (let i = 0; i < 9 + context.mood.wear * 12; i++) s.ball([0.004, 0.002, 0.006], [(rnd() - 0.5) * w * 0.9, 0.047, (rnd() - 0.5) * d * 0.9], edge, 6);
    if (a.scaleBar) for (let i = 0; i < 8; i++) s.box([0.018, 0.004, 0.016], [-0.064 + i * 0.018, 0.049, 0.18], s.material(i % 2 ? '#ece9d9' : '#252c29'));
    return s.finish();
  },
});
