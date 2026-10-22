import * as THREE from 'three';
import { Sculpture, choice, score, noul, defineThing } from '@conjure/kit';

export default defineThing({
  questions: {
    style: choice('What training style shapes the trunk?', { upright: 'A gently curved upright trunk.', windswept: 'Trunk and foliage lean strongly to one side.', cascade: 'The trunk bends and cascades over the pot edge.', twin: 'Two trunks share a root base.' }),
    foliage: choice('What kind of canopy does it carry?', { pine: 'Dark flat pine pads.', maple: 'Round clusters of small maple leaves.', blossom: 'Clouds of pink blossoms.', bare: 'An exposed winter branch skeleton.' }),
    size: score('How large is the specimen?', ['A tiny desk bonsai', 'A mature tabletop tree', 'A large exhibition bonsai']),
    pot: choice('What vessel holds the tree?', { oval: 'A low oval unglazed pot.', rectangle: 'A rectangular blue ceramic tray.', round: 'A round terracotta bowl.' }),
    roots: noul('Are thick radial roots visible above the soil?'),
    stone: noul('Does the trunk clasp a small rock in the pot?'),
    wire: noul('Is copper training wire wound around the trunk?'),
    moss: noul('Does a low moss carpet cover the soil?'),
  },
  build(a, context) {
    const s = new Sculpture(context), h = 0.18 + a.size * 0.68, bark = s.material('#77604b'), leaf = s.material({ pine: '#496651', maple: '#769552', blossom: '#d2a0b4', bare: '#79634f' }[a.foliage]), ceramic = s.material(a.pot === 'rectangle' ? '#526f83' : a.pot === 'round' ? '#a07458' : '#797365'), dirt = s.material(a.moss ? '#768450' : '#5e5245');
    if (a.pot === 'rectangle') { s.box([h * 0.95, h * 0.16, h * 0.62], [0, h * 0.1, 0], ceramic); s.box([h * 0.85, h * 0.02, h * 0.52], [0, h * 0.19, 0], dirt); }
    else { const pot = s.lathe([[h * 0.32, 0], [h * 0.42, h * 0.05], [h * 0.49, h * 0.18], [h * 0.44, h * 0.21], [h * 0.38, h * 0.16], [0, h * 0.16]], ceramic); pot.scale.z = a.pot === 'oval' ? 0.7 : 1; const soil = s.cylinder(h * 0.42, h * 0.42, h * 0.018, [0, h * 0.17, 0], dirt); soil.scale.z = a.pot === 'oval' ? 0.7 : 1; }
    if (a.stone) s.ball([h * 0.16, h * 0.2, h * 0.13], [-h * 0.1, h * 0.29, 0], s.material('#8c9593', { flatShading: true }), 7);
    if (a.roots) for (let i = 0; i < 7; i++) { const t = i * Math.PI * 2 / 7; s.tube([[0, h * 0.3, 0], [Math.cos(t) * h * 0.15, h * 0.23, Math.sin(t) * h * 0.12], [Math.cos(t) * h * 0.31, h * 0.19, Math.sin(t) * h * 0.25]], h * 0.022, bark); }
    const tops: [number, number, number][] = [];
    for (let trunk = 0; trunk < (a.style === 'twin' ? 2 : 1); trunk++) {
      const path: [number, number, number][] = [], lean = a.style === 'windswept' ? 0.65 : a.style === 'cascade' ? 0.82 : trunk === 1 ? -0.27 : 0.18;
      for (let j = 0; j < 6; j++) { const f = j / 5; path.push([lean * h * f + Math.sin(f * 5) * h * 0.055, h * 0.2 + h * (a.style === 'cascade' ? Math.sin(f * Math.PI * 0.9) * 0.55 : f * (trunk ? 0.7 : 1)), Math.sin(f * 3) * h * 0.04]); }
      for (let j = 0; j < 5; j++) s.rod(path[j], path[j + 1], h * (0.048 - j * 0.007), bark, h * (0.04 - j * 0.007));
      if (a.wire) { const pts: [number, number, number][] = []; for (let j = 0; j < 50; j++) { const f = j / 49, ix = Math.min(4, Math.floor(f * 5)), blend = f * 5 - ix, p = new THREE.Vector3(...path[ix]).lerp(new THREE.Vector3(...path[ix + 1]), blend); pts.push([p.x + Math.cos(f * 35) * h * 0.05, p.y, p.z + Math.sin(f * 35) * h * 0.05]); } s.tube(pts, h * 0.007, s.material('#ac7957', { metalness: 0.6 })); }
      for (let j = 2; j < 6; j++) for (const side of [-1, 1]) { const p = path[j], reach = h * (0.3 - j * 0.027), q: [number, number, number] = [p[0] + side * reach, p[1] + h * 0.06, p[2] + (context.random() - 0.5) * h * 0.25]; s.tube([p, [(p[0] + q[0]) / 2, q[1] - h * 0.02, q[2] * 0.5], q], h * 0.014, bark); tops.push(q); if (a.foliage === 'bare') { s.rod(q, [q[0] + side * h * 0.06, q[1] + h * 0.1, q[2] + h * 0.04], h * 0.007, bark, h * 0.002); } }
      tops.push(path[5]);
    }
    if (a.foliage !== 'bare') for (const p of tops) for (let i = 0; i < 3; i++) s.ball([h * 0.13, h * (a.foliage === 'pine' ? 0.045 : 0.085), h * 0.11], [p[0] + (i - 1) * h * 0.085, p[1] + h * 0.02, p[2]], leaf, 12);
    return s.finish();
  },
});
