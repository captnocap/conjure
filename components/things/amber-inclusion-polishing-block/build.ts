import * as THREE from 'three';
import { Sculpture, choice, defineThing, noul, score } from '@conjure/kit';

export default defineThing({
  questions: {
    shape: choice('How is the amber shaped?', { pebble: 'A broad oval polished pebble.', shard: 'A tall irregular faceted shard.', tablet: 'A thin rectangular study tablet.', pendant: 'A hanging teardrop with a drilled suspension hole.' }),
    inclusion: choice('What is trapped inside the amber?', { fly: 'A small winged insect with six legs.', spider: 'A long legged spider held in resin.', fern: 'A delicate branching fern sprig.', seeds: 'Three winged seeds drifting at different angles.' }),
    resin: choice('What colour is the amber?', { honey: 'Clear pale honey gold.', cognac: 'Deep cognac brown.', lemon: 'Lemon yellow with a cool green edge.', cherry: 'Warm cherry red fossil resin.' }),
    clarity: score('How transparent is the polished window?', ['A cloudy veil around a dark inclusion', 'Clear warm resin', 'A sharply visible inclusion behind glassy resin']),
    bubbles: score('How many ancient bubbles surround the inclusion?', ['None', 'A few trapped round bubbles', 'Many small bubbles frozen in resin']),
    finish: choice('What stage of polishing is visible?', { finished: 'All facets polished and bright.', rind: 'A rough brown rind remains around the edge.', half: 'A polished window contrasts with an untouched back.', sanded: 'Fine pale abrasive lines cross one edge.' }),
    mount: choice('What holds the specimen?', { cork: 'A low cork preparation block.', prongs: 'Two slender brass prongs on a dark base.', velvet: 'A shallow velvet lined box.', cloth: 'A folded pale polishing cloth.' }),
    fissure: noul('Does a pale internal fissure cross the resin?'),
    ticket: noul('Is there a small handwritten specimen ticket?'),
  },
  build(a, context) {
    const s = new Sculpture(context), rnd = context.random;
    const tint = { honey: '#e9af32', cognac: '#af661e', lemon: '#d9cc47', cherry: '#b64d27' }[a.resin];
    const resin = new THREE.MeshPhysicalMaterial({ color: tint, transparent: true, opacity: 0.18 + (1 - a.clarity) * 0.28, roughness: a.finish === 'finished' ? 0.08 : 0.24, metalness: 0, depthWrite: false, side: THREE.DoubleSide });
    const amberEdge = s.material(tint, { roughness: 0.34 }), insect = s.material('#3d2c1c'), brass = s.material('#a7843a', { metalness: 0.7 });
    const baseY = a.mount === 'prongs' ? 0.06 : 0.026;
    if (a.mount === 'cork') { s.box([0.2, 0.035, 0.14], [0, 0.0175, 0], s.material('#af8b54')); for (let j = 0; j < 16; j++) s.ball([0.0025, 0.0015, 0.002], [(rnd() - 0.5) * 0.18, 0.036, (rnd() - 0.5) * 0.13], insect, 6); }
    if (a.mount === 'prongs') { s.box([0.18, 0.014, 0.12], [0, 0.007, 0], s.material('#38403c')); for (const x of [-0.05, 0.05]) s.rod([x, 0.01, 0], [x * 0.75, 0.1, 0], 0.003, brass); }
    if (a.mount === 'velvet') { const wood = s.material('#654b35'); s.box([0.22, 0.02, 0.17], [0, 0.01, 0], s.material('#3b4036')); for (const x of [-0.105, 0.105]) s.box([0.012, 0.04, 0.17], [x, 0.02, 0], wood); for (const z of [-0.08, 0.08]) s.box([0.22, 0.04, 0.012], [0, 0.02, z], wood); }
    if (a.mount === 'cloth') { const cloth = s.material('#d5ccb3', { side: THREE.DoubleSide }); s.surface((u, v, p) => p.set((u - 0.5) * 0.26, 0.006 + 0.003 * (1 + Math.sin(u * 24 + v * 9)) + 0.005 * Math.sin(v * Math.PI), (v - 0.5) * 0.19), cloth, { segments: [24, 16], flip: true }); }
    const h = a.shape === 'shard' ? 0.19 : a.shape === 'pendant' ? 0.16 : 0.11, cy = baseY + h / 2;
    const body = a.shape === 'tablet' ? s.box([0.16, h, 0.035], [0, cy, 0], resin) : s.mesh(new THREE.IcosahedronGeometry(1, a.shape === 'shard' ? 0 : 1), resin, [0, cy, 0]);
    if (a.shape !== 'tablet') body.scale.set(a.shape === 'shard' ? 0.07 : 0.095, h / 2, 0.042);
    const outline: [number, number, number][] = [];
    for (let i = 0; i <= 36; i++) { const t = i / 36 * Math.PI * 2; outline.push([Math.cos(t) * (a.shape === 'shard' ? 0.066 : 0.087), cy + Math.sin(t) * h * 0.45, -0.023]); }
    s.tube(outline, a.finish === 'rind' ? 0.006 : 0.0015, a.finish === 'rind' ? s.material('#8f602b') : amberEdge);
    if (a.inclusion === 'fly' || a.inclusion === 'spider') {
      s.ball([0.008, 0.02, 0.006], [0, cy, 0.006], insect, 12); s.ball([0.007, 0.007, 0.006], [0, cy + 0.026, 0.006], insect, 10);
      const n = a.inclusion === 'spider' ? 4 : 3;
      for (const sign of [-1, 1]) for (let k = 0; k < n; k++) s.tube([[sign * 0.003, cy + 0.012 - k * 0.009, 0.007], [sign * (0.025 + k * 0.002), cy + 0.026 - k * 0.015, 0.009], [sign * (0.04 - k * 0.003), cy + 0.04 - k * 0.025, 0.01]], 0.0012, insect);
      if (a.inclusion === 'fly') for (const sign of [-1, 1]) { const wing = s.ball([0.027, 0.012, 0.0018], [sign * 0.023, cy + 0.014, 0.01], s.material('#c6a977', { transparent: true, opacity: 0.48, depthWrite: false }), 12); wing.rotation.z = sign * 0.42; s.rod([0, cy + 0.009, 0.014], [sign * 0.045, cy + 0.025, 0.014], 0.0008, insect); }
    } else if (a.inclusion === 'fern') {
      s.rod([-0.025, cy - 0.04, 0.01], [0.025, cy + 0.045, 0.01], 0.0015, insect);
      for (let i = 0; i < 8; i++) { const x = -0.02 + i * 0.006, y = cy - 0.03 + i * 0.01; for (const sign of [-1, 1]) s.rod([x, y, 0.01], [x + sign * (0.024 - i * 0.0018), y + 0.014, 0.012], 0.0012, insect); }
    } else for (let j = 0; j < 3; j++) { const x = (j - 1) * 0.033, y = cy + (j % 2 ? 0.02 : -0.01); s.ball([0.006, 0.011, 0.003], [x, y, 0.01], insect, 10); const wing = s.ball([0.009, 0.025, 0.002], [x + 0.012, y + 0.018, 0.01], amberEdge, 12); wing.rotation.z = -0.4; }
    for (let j = 0; j < Math.round(a.bubbles * 18); j++) s.ball([0.0025, 0.0025, 0.0025], [(rnd() - 0.5) * 0.13, cy + (rnd() - 0.5) * h * 0.7, 0.025], s.material('#f0d991', { transparent: true, opacity: 0.55, depthWrite: false }), 8);
    if (a.fissure) s.tube([[-0.06, cy - 0.03, 0.023], [-0.01, cy + 0.003, 0.026], [0.015, cy - 0.005, 0.026], [0.06, cy + 0.03, 0.02]], 0.0012, s.material('#e5d5a6'));
    if (a.finish === 'sanded' || a.finish === 'half') for (let j = 0; j < 6; j++) s.rod([-0.065, cy - 0.04 + j * 0.008, 0.026], [-0.04, cy - 0.033 + j * 0.008, 0.027], 0.0008, s.material('#d3b77a'));
    if (a.shape === 'pendant') { s.ring(0.008, 0.0018, [0, cy + h * 0.38, 0.025], brass); s.tube([[0, cy + h * 0.4, 0], [-0.07, cy + h * 0.6, 0], [-0.13, 0.005, 0]], 0.0012, insect); }
    if (a.ticket) { const label = s.label('RESIN / 19', 0.08, 0.028, [0.08, 0.003, 0.11]); label.rotation.x = -Math.PI / 2; }
    return s.finish();
  },
});
