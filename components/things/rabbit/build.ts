import * as THREE from 'three';
import { Sculpture, choice, score, noul, defineThing } from '@conjure/kit';

export default defineThing({
  questions: {
    coat: choice('What coat does the rabbit carry?', { cream: 'Warm cream fur.', grey: 'Soft grey fur.', brown: 'Sandy brown fur.', black: 'Dark charcoal fur.', patches: 'White fur with brown patches.' }),
    size: score('How large is the rabbit?', ['A small young rabbit', 'A common garden rabbit', 'A large domestic rabbit']),
    pose: choice('What is the rabbit doing?', { sit: 'Sitting upright with tucked front paws.', crouch: 'Crouching low on four paws.', stretch: 'Stretching forward with the nose near the ground.' }),
    ears: choice('How are the ears held?', { alert: 'Both ears upright and alert.', one: 'One ear upright, one angled outward.', lop: 'Both ears flop beside the head.' }),
    fur: score('How visible is the soft fur texture?', ['Smooth silhouette', 'Soft cheek and tail tufts', 'Small tufts over the coat']),
    whiskers: noul('Are fine whiskers visible beside the nose?'),
    food: noul('Is a small leafy sprig held between the front paws?'),
  },
  build(a, context) {
    const s = new Sculpture(context), length = 0.12 + a.size * 0.55, u = length / 2, fur = s.material({ cream: '#ded8c4', grey: '#b4bcb8', brown: '#b8a184', black: '#78807b', patches: '#e1dfce' }[a.coat]), pink = s.material('#cda7a2'), dark = s.material('#5a635c'), y = u * (a.pose === 'sit' ? 0.6 : 0.36), headY = y + u * (a.pose === 'stretch' ? -0.01 : a.pose === 'sit' ? 0.48 : 0.29), headZ = u * (a.pose === 'stretch' ? 0.82 : 0.49);
    const body = s.ball([u * 0.5, u * (a.pose === 'sit' ? 0.62 : 0.38), u * (a.pose === 'stretch' ? 0.85 : 0.62)], [0, y, -u * 0.13], fur, 24); body.rotation.x = a.pose === 'sit' ? 0.1 : 0;
    s.ball([u * 0.35, u * 0.34, u * 0.35], [0, headY, headZ], fur, 20);
    s.ball([u * 0.2, u * 0.17, u * 0.16], [0, headY - u * 0.13, headZ + u * 0.29], fur, 14); s.ball([u * 0.062, u * 0.043, u * 0.035], [0, headY - u * 0.085, headZ + u * 0.43], pink, 10);
    s.ball([u * 0.2, u * 0.19, u * 0.2], [0, y + u * 0.04, -u * 0.73], fur, 14);
    for (const side of [-1, 1]) { s.ball([u * 0.032, u * 0.039, u * 0.029], [side * u * 0.29, headY + u * 0.07, headZ + u * 0.16], dark, 12); const earAngle = a.ears === 'lop' ? side * 1.12 : a.ears === 'one' && side > 0 ? 0.65 : side * 0.12, ear = s.ball([u * 0.11, u * 0.47, u * 0.08], [side * u * (a.ears === 'lop' ? 0.53 : 0.21), headY + u * (a.ears === 'lop' ? 0.17 : 0.58), headZ - u * 0.05], fur, 18); ear.rotation.z = earAngle; const inset = s.ball([u * 0.065, u * 0.34, u * 0.014], [ear.position.x, ear.position.y, ear.position.z + u * 0.07], pink, 14); inset.rotation.z = earAngle; s.ball([u * 0.26, u * 0.19, u * 0.28], [side * u * 0.42, u * 0.21, -u * 0.36], fur, 16); s.ball([u * 0.14, u * 0.065, u * 0.3], [side * u * 0.38, u * 0.075, -u * 0.17], fur, 14); const handY = a.pose === 'sit' ? u * 0.27 : u * 0.075; s.rod([side * u * 0.24, y + u * 0.12, u * 0.2], [side * u * 0.23, handY, u * (a.pose === 'stretch' ? 0.7 : 0.48)], u * 0.08, fur, u * 0.07); s.ball([u * 0.11, u * 0.07, u * 0.19], [side * u * 0.23, handY, u * 0.56], fur, 12); if (a.whiskers) for (let i = 0; i < 3; i++) s.rod([side * u * 0.07, headY - u * 0.09, headZ + u * 0.38], [side * u * 0.58, headY + (i - 1) * u * 0.12, headZ + u * (0.31 + i * 0.03)], u * 0.004, dark, u * 0.0015); }
    if (a.coat === 'patches') for (let i = 0; i < 5; i++) { const t = i * 2.4; s.ball([u * 0.14, u * 0.045, u * 0.18], [Math.cos(t) * u * 0.26, y + u * 0.32, Math.sin(t) * u * 0.4 - u * 0.13], s.material('#a99b81'), 12); }
    if (a.fur > 0.25) for (let i = 0; i < 20; i++) { const t = i * 2.4, rr = Math.sqrt((i + 0.5) / 20); s.ball([u * 0.055, u * 0.045, u * 0.055], [Math.cos(t) * u * 0.45 * rr, y + u * (a.pose === 'sit' ? 0.6 : 0.37) * Math.sqrt(1 - rr * rr), Math.sin(t) * u * 0.52 * rr - u * 0.13], fur, 8); }
    if (a.food) { const green = s.material('#8ba06c'); s.rod([0, u * 0.2, u * 0.64], [0, u * 0.55, u * 0.7], u * 0.015, green); for (const side of [-1, 1]) s.ball([u * 0.13, u * 0.024, u * 0.07], [side * u * 0.1, u * 0.42, u * 0.68], green, 10); }
    return s.finish();
  },
});
