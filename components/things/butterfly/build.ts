import * as THREE from 'three';
import { Sculpture, choice, score, noul, defineThing } from '@conjure/kit';

export default defineThing({
  questions: {
    wings: choice('What silhouette do the wings make?', { round: 'Broad rounded wings.', swallowtail: 'Pointed forewings and trailing hindwing tails.', moth: 'Long angular mothlike wings.' }),
    pattern: choice('What pattern covers the wings?', { monarch: 'Orange panels with dark veins and white rim dots.', blue: 'Blue wings with dark edges.', eyes: 'Ochre wings with large peacock eye spots.', white: 'Pale white wings with charcoal tips.', violet: 'Lavender wings with pink markings.' }),
    span: score('What is the wingspan?', ['A tiny garden butterfly', 'A medium butterfly', 'A large tropical butterfly']),
    pose: choice('How are the wings held?', { open: 'Spread nearly flat for basking.', raised: 'Lifted into a shallow V.', folded: 'Held nearly vertical above the body.' }),
    markings: score('How prominent are the wing markings?', ['A few quiet accents', 'Clear veins and eye spots', 'Bold decorated wings']),
    perch: choice('What supports the insect?', { leaf: 'A slender green leaf.', twig: 'A narrow diagonal twig.', bare: 'Only its fine legs touch the ground.' }),
    curled: noul('Do the antennae end in curled club tips?'),
  },
  build(a, context) {
    const s = new Sculpture(context), span = 0.025 + a.span * 0.13, unit = span / 2, dark = s.material('#464044'), wing = s.material({ monarch: '#d3914e', blue: '#5994bf', eyes: '#bda269', white: '#e6e5d5', violet: '#ab8ac3' }[a.pattern], { side: THREE.DoubleSide }), accent = s.material(a.pattern === 'monarch' || a.pattern === 'white' ? '#ddd8bd' : '#ceb58a'), y = unit * 0.16;
    if (a.perch === 'leaf') { const leaf = s.ball([unit * 1.08, unit * 0.025, unit * 0.33], [0, unit * 0.035, 0], s.material('#779153'), 14); leaf.rotation.y = -0.2; s.rod([-unit, unit * 0.07, 0], [unit, unit * 0.07, 0], unit * 0.008, s.material('#a6ae68')); }
    if (a.perch === 'twig') s.rod([-unit * 0.75, unit * 0.02, -unit * 0.24], [unit * 0.75, unit * 0.08, unit * 0.24], unit * 0.03, s.material('#8a7156'));
    s.ball([unit * 0.045, unit * 0.055, unit * 0.26], [0, y, -unit * 0.06], dark, 14);
    s.ball([unit * 0.065, unit * 0.07, unit * 0.065], [0, y, unit * 0.22], dark, 12);
    for (const side of [-1, 1]) {
      s.tube([[side * unit * 0.04, y, unit * 0.24], [side * unit * 0.15, y + unit * 0.12, unit * 0.4], [side * unit * 0.19, y + unit * 0.12, unit * 0.46]], unit * 0.008, dark);
      if (a.curled) { const tip = s.ring(unit * 0.035, unit * 0.009, [side * unit * 0.19, y + unit * 0.12, unit * 0.46], dark, Math.PI * 1.6); tip.rotation.y = side * 0.5; }
      for (let i = 0; i < 3; i++) s.tube([[side * unit * 0.025, y, unit * (0.12 - i * 0.1)], [side * unit * 0.12, y * 0.55, unit * (0.2 - i * 0.16)], [side * unit * 0.2, unit * 0.065, unit * (0.22 - i * 0.18)]], unit * 0.006, dark);
      for (let hind = 0; hind < 2; hind++) {
        const start = s.root.children.length, group = new THREE.Group(), shape = new THREE.Shape();
        shape.moveTo(0, 0); shape.bezierCurveTo(unit * 0.34, unit * (hind ? -0.14 : 0.57), unit * (a.wings === 'moth' ? 1.15 : 0.9), unit * (hind ? -0.7 : 0.68), unit * (hind ? 0.7 : 1), unit * (hind ? -0.48 : 0.3)); shape.bezierCurveTo(unit * 0.85, unit * (hind ? -0.82 : 0.07), unit * 0.42, unit * (hind ? -0.83 : -0.28), 0, unit * (hind ? -0.2 : -0.1)); shape.closePath();
        const surface = s.mesh(new THREE.ShapeGeometry(shape, 20), wing); surface.rotation.x = Math.PI / 2;
        const outline = shape.getPoints(30).map((p): [number, number, number] => [p.x, unit * 0.008, p.y]); s.tube(outline, unit * (0.006 + a.markings * 0.013), dark, true);
        if (a.markings > 0.2) for (let i = 0; i < 5; i++) { const t = (i - 2) * 0.22, z = hind ? -unit * 0.45 : unit * 0.24; s.rod([unit * 0.06, unit * 0.011, -unit * 0.04], [unit * (0.66 + Math.cos(t) * 0.12), unit * 0.011, z + i * unit * 0.035], unit * 0.005, dark); }
        if (a.pattern === 'eyes') { const eye = s.ring(unit * 0.16, unit * 0.025, [unit * 0.52, unit * 0.014, hind ? -unit * 0.43 : unit * 0.28], dark); eye.rotation.x = Math.PI / 2; s.ball([unit * 0.07, unit * 0.01, unit * 0.07], eye.position.toArray() as [number, number, number], accent, 12); }
        else if (a.markings > 0.25) for (let i = 0; i < 6; i++) { const t = i / 5; s.ball([unit * 0.025, unit * 0.009, unit * 0.038], [unit * (0.54 + t * 0.25), unit * 0.018, (hind ? -0.5 : 0.36) * unit + Math.sin(t * Math.PI) * unit * 0.08], accent, 8); }
        if (hind && a.wings === 'swallowtail') s.tube([[unit * 0.45, 0, -unit * 0.62], [unit * 0.43, 0, -unit * 0.94], [unit * 0.48, 0, -unit]], unit * 0.026, dark);
        for (const part of s.root.children.slice(start)) group.add(part);
        group.position.y = y; group.scale.x = side; group.rotation.z = side * (a.pose === 'folded' ? 1.2 : a.pose === 'raised' ? 0.5 : 0.08); s.root.add(group);
      }
    }
    return s.finish();
  },
});
