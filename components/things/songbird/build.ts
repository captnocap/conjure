import * as THREE from 'three';
import { Sculpture, choice, score, noul, defineThing } from '@conjure/kit';

export default defineThing({
  questions: {
    plumage: choice('Which plumage pattern suits the bird?', { robin: 'Warm red-orange breast and brown wings.', blue: 'Powder-blue head and wings, pale breast.', sparrow: 'Tan and brown with a striped head.', gold: 'Golden yellow breast with dark wings.', white: 'Pale grey and cream feathers.' }),
    size: score('How large is the bird?', ['A tiny finch', 'A common garden songbird', 'A thrush-sized songbird']),
    pose: choice('How does it hold its wings?', { folded: 'Both wings folded neatly.', stretch: 'One wing extends to the side.', flight: 'Both wings stretch outward.' }),
    tail: choice('What shape has the tail?', { narrow: 'A narrow tapered tail.', fan: 'A spread fan of tail feathers.', fork: 'A distinctly forked tail.' }),
    perch: choice('Where does it stand?', { twig: 'On a small branching twig.', stone: 'On a round garden stone.', bare: 'On its delicate feet.' }),
    singing: noul('Is its beak open in song?'),
    crest: noul('Does a small crest rise on its head?'),
    feathers: score('How clearly are individual flight feathers outlined?', ['Smooth folded wings', 'Several separate feather tips', 'Many layered feather shapes']),
  },
  build(a, context) {
    const s = new Sculpture(context), length = 0.085 + a.size * 0.23, u = length / 2, colors = { robin: ['#9e8a70', '#c79878'], blue: ['#83a5b9', '#cdd6cb'], sparrow: ['#aa997d', '#c8bca0'], gold: ['#7f846d', '#d2bc73'], white: ['#adb9b8', '#e1dfcf'] }, back = s.material(colors[a.plumage][0]), breast = s.material(colors[a.plumage][1]), dark = s.material('#56625a'), beak = s.material('#bbaa75'), ground = a.perch === 'bare' ? 0 : u * 0.23;
    if (a.perch === 'twig') { s.rod([-u * 0.85, u * 0.1, 0], [u * 0.85, u * 0.25, 0], u * 0.07, s.material('#9c866a')); s.rod([u * 0.25, u * 0.2, 0], [u * 0.55, 0, -u * 0.4], u * 0.035, s.material('#9c866a')); }
    if (a.perch === 'stone') s.ball([u * 0.6, u * 0.2, u * 0.46], [0, u * 0.18, 0], s.material('#a6afa2', { flatShading: true }), 9);
    const y = ground + u * 0.62;
    s.ball([u * 0.34, u * 0.44, u * 0.44], [0, y, 0], back, 20); s.ball([u * 0.27, u * 0.3, u * 0.12], [0, y - u * 0.03, u * 0.36], breast, 18); s.ball([u * 0.27, u * 0.28, u * 0.27], [0, y + u * 0.43, u * 0.23], back, 18);
    for (const side of [-1, 1]) { s.ball([u * 0.032, u * 0.035, u * 0.026], [side * u * 0.23, y + u * 0.46, u * 0.37], dark, 10); s.rod([side * u * 0.12, ground + u * 0.14, u * 0.05], [side * u * 0.14, ground + u * 0.45, -u * 0.01], u * 0.02, dark); for (let i = 0; i < 3; i++) s.rod([side * u * 0.12, ground + u * 0.12, u * 0.04], [side * u * 0.12 + (i - 1) * u * 0.045, ground + u * 0.09, u * 0.19], u * 0.013, dark, u * 0.005); const extended = a.pose === 'flight' || (a.pose === 'stretch' && side > 0), reach = extended ? u * 0.8 : u * 0.15, wing = s.ball([extended ? u * 0.6 : u * 0.14, u * 0.065, u * 0.38], [side * (u * 0.28 + reach * 0.5), y + u * 0.03, -u * 0.08], back, 16); wing.rotation.y = side * 0.25; wing.rotation.z = side * (extended ? 0.15 : 1.1); for (let i = 0; i < 3 + Math.round(a.feathers * 4); i++) { const f = i / 7; s.rod([side * u * 0.28, y + u * 0.04, u * 0.09], [side * (u * 0.33 + reach * (0.65 + f * 0.45)), y - u * 0.09, -u * (0.25 + f * 0.23)], u * 0.035, back, u * 0.009); } }
    const mouthY = y + u * 0.4, top = s.cylinder(0, u * 0.075, u * 0.24, [0, mouthY + (a.singing ? u * 0.035 : 0), u * 0.54], beak, 5); top.rotation.x = Math.PI / 2 - (a.singing ? 0.2 : 0); if (a.singing) { const bottom = s.cylinder(0, u * 0.06, u * 0.23, [0, mouthY - u * 0.04, u * 0.54], beak, 5); bottom.rotation.x = Math.PI / 2 + 0.2; }
    for (let i = 0; i < 7; i++) { const offset = a.tail === 'fan' ? (i - 3) * u * 0.1 : (i - 3) * u * 0.027, tailLength = a.tail === 'fork' ? u * (0.57 + Math.abs(i - 3) * 0.06) : u * 0.64; s.rod([offset * 0.3, y - u * 0.17, -u * 0.3], [offset, y - u * 0.37, -u * 0.3 - tailLength], u * 0.038, back, u * 0.02); }
    if (a.crest) for (let i = 0; i < 3; i++) s.rod([(i - 1) * u * 0.055, y + u * 0.68, u * 0.15], [(i - 1) * u * 0.06, y + u * (0.89 - Math.abs(i - 1) * 0.04), u * 0.1], u * 0.026, back, u * 0.005);
    return s.finish();
  },
});
