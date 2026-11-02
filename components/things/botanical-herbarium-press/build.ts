import * as THREE from 'three';
import { Sculpture, choice, defineThing, noul, score } from '@conjure/kit';

export default defineThing({
  questions: {
    closure: choice('How is the plant press tightened?', { straps: 'Two leather straps cross the slatted boards.', screws: 'Four long screw posts tighten the corners.', cord: 'Crossed cotton cords are tied over the boards.', stone: 'A broad flat stone weighs down the press.' }),
    specimen: choice('Which plant is being preserved?', { fern: 'A long fern frond with paired leaflets.', meadow: 'A branching meadow flower with a pressed daisy head.', grass: 'A spray of tall fine grasses with seed heads.', maple: 'A broad five-point maple leaf on a short twig.' }),
    stage: choice('What is the press doing now?', { closed: 'Tightly closed with only leaf tips escaping.', opening: 'The top board is propped up to reveal the specimen.', loaded: 'Open flat, a new plant laid on the top paper.', field: 'Packed for a field trip with straps and a collecting label.' }),
    timber: choice('What wood are the boards?', { pine: 'Pale fresh pine with dark slat ends.', walnut: 'Deep brown walnut.', green: 'Old green painted slats.', red: 'Red-stained slats with brass fastenings.' }),
    sheets: score('How thick is the stack of drying papers?', ['A single fresh specimen', 'A week of collecting', 'A thick season of field notes']),
    foliage: score('How full is the preserved spray?', ['One sparse cutting', 'A complete branch', 'A broad overlapping specimen']),
    tag: noul('Is a handwritten accession tag tied to a strap?'),
    flower: noul('Is a loose flower pressed beside the main plant?'),
  },
  build(a, context) {
    const s = new Sculpture(context), { random } = context;
    const wood = s.material({ pine: '#c7ac7b', walnut: '#684735', green: '#59715a', red: '#9a5141' }[a.timber]);
    const paper = s.material('#e5ddbd'), blotter = s.material('#aaa184'), leaf = s.material(a.specimen === 'maple' ? '#9b6c40' : '#65744a'), stem = s.material('#6d653e'), strap = s.material('#684a31'), steel = s.material('#9c9c87', { metalness: 0.6 });
    const h = 0.05 + a.sheets * 0.2;
    const board = (y: number, tilted = false) => {
      const start = s.root.children.length;
      for (let i = 0; i < 5; i++) s.box([0.095, 0.018, 0.67], [-0.23 + i * 0.115, y, 0], wood);
      for (const z of [-0.22, 0.22]) s.box([0.57, 0.02, 0.05], [0, y + 0.015, z], wood);
      if (tilted) {
        const lid = new THREE.Group();
        for (const mesh of s.root.children.slice(start)) { mesh.position.sub(new THREE.Vector3(0, y, -0.335)); lid.add(mesh); }
        lid.position.set(0, y, -0.335); lid.rotation.x = -0.65; s.root.add(lid);
        for (const x of [-0.24, 0.24]) s.rod([x, y - 0.02, 0.26], [x, y + 0.31, 0.14], 0.008, steel);
      }
    };
    board(0.025);
    const n = Math.round(3 + a.sheets * 12);
    for (let i = 0; i < n; i++) s.box([0.49 + random() * 0.012, h / n * 0.88, 0.6], [(random() - 0.5) * 0.008, 0.05 + (i + 0.5) * h / n, (random() - 0.5) * 0.006], i % 2 ? blotter : paper);
    const y = h + 0.056;
    const branch = (x: number, z: number, length: number, theta: number, leafCount: number) => {
      s.rod([x, y + 0.004, z], [x + Math.sin(theta) * length, y + 0.005, z + Math.cos(theta) * length], 0.0025, stem);
      for (let i = 1; i <= leafCount; i++) for (const side of [-1, 1]) {
        const t = i / (leafCount + 1), px = x + Math.sin(theta) * length * t, pz = z + Math.cos(theta) * length * t;
        const m = s.ball([0.018, 0.0025, 0.055 * (1 - t * 0.5)], [px + side * 0.026, y + 0.007, pz], leaf, 10); m.rotation.y = theta + side * 0.85;
      }
    };
    if (a.specimen === 'fern') branch(-0.06, -0.24, 0.55, 0.2, Math.round(5 + a.foliage * 6));
    else if (a.specimen === 'grass') for (let i = 0; i < 3 + Math.round(a.foliage * 4); i++) { const x = (i - 3) * 0.045; s.rod([0, y + 0.005, -0.26], [x, y + 0.008, 0.22], 0.002, stem); for (let j = 0; j < 5; j++) s.ball([0.009, 0.003, 0.014], [x + (j % 2 ? 0.007 : -0.007), y + 0.009, 0.1 + j * 0.023], stem, 8); }
    else if (a.specimen === 'maple') {
      s.rod([0, y, -0.25], [0, y, 0.05], 0.004, stem);
      for (let i = 0; i < 5; i++) { const theta = (i - 2) * 0.6; const m = s.ball([0.04 + a.foliage * 0.012, 0.003, 0.12], [Math.sin(theta) * 0.07, y + 0.01, 0.07 + Math.cos(theta) * 0.04], leaf, 8); m.rotation.y = theta; s.rod([0, y + 0.014, 0.02], [Math.sin(theta) * 0.16, y + 0.014, 0.07 + Math.cos(theta) * 0.13], 0.0015, stem); }
    } else branch(-0.03, -0.24, 0.43, 0.2, 3 + Math.round(a.foliage * 3));
    if (a.flower || a.specimen === 'meadow') {
      const cx = a.specimen === 'meadow' ? 0.07 : -0.19, cz = 0.21;
      for (let i = 0; i < 9; i++) { const theta = i / 9 * Math.PI * 2; const m = s.ball([0.011, 0.003, 0.033], [cx + Math.sin(theta) * 0.026, y + 0.01, cz + Math.cos(theta) * 0.026], s.material('#cba46c'), 10); m.rotation.y = theta; }
      s.ball([0.015, 0.005, 0.015], [cx, y + 0.013, cz], s.material('#a1783b'), 10);
    }
    const topY = y + 0.02;
    if (a.stage !== 'loaded') board(topY, a.stage === 'opening');
    if (a.closure === 'screws') for (const x of [-0.26, 0.26]) for (const z of [-0.27, 0.27]) { s.cylinder(0.007, 0.007, h + 0.25, [x, (h + 0.25) / 2, z], steel, 10); s.box([0.065, 0.014, 0.014], [x, h + 0.19, z], steel); }
    else if (a.closure === 'stone') s.ball([0.2, 0.065, 0.17], a.stage === 'loaded' || a.stage === 'opening' ? [0.53, 0.065, 0] : [0, topY + 0.075, 0], s.material('#8b8b79'), 10);
    else for (const x of [-0.17, 0.17]) {
      if (a.stage === 'loaded' || a.stage === 'opening') { s.tube([[x, 0.025, -0.32], [x + 0.25, 0.015, -0.42], [x + 0.25, 0.014, 0.32], [x, 0.025, 0.34]], a.closure === 'straps' ? 0.012 : 0.005, strap); }
      else if (a.closure === 'straps') { s.box([0.036, 0.012, 0.71], [x, topY + 0.04, 0], strap); for (const z of [-0.35, 0.35]) s.box([0.036, topY + 0.03, 0.012], [x, (topY + 0.03) / 2, z], strap); s.box([0.055, 0.018, 0.065], [x, topY + 0.05, 0.21], steel); }
      else s.tube([[x, 0.015, -0.35], [x, topY + 0.04, -0.35], [-x, topY + 0.045, 0.35], [-x, 0.015, 0.35]], 0.005, blotter);
    }
    if (a.tag || a.stage === 'field') { const tag = s.label('HERBARIUM 042', 0.24, 0.07, [0.18, 0.018, 0.43]); tag.rotation.x = -Math.PI / 2; s.rod([0.17, topY + 0.04, 0.32], [0.18, 0.02, 0.41], 0.002, blotter); }
    return s.finish();
  },
});
