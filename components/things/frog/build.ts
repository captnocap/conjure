import * as THREE from 'three';
import { Sculpture, choice, score, noul, defineThing } from '@conjure/kit';

export default defineThing({
  questions: {
    kind: choice('What frog anatomy does it have?', { tree: 'A slender tree frog with round toe pads.', pond: 'A broad pond frog with webbed toes.', toad: 'A squat toad with bumpy skin.' }),
    size: score('How large is the frog?', ['A tiny froglet', 'A palm-sized frog', 'A large bullfrog']),
    pigment: choice('What colours cover its skin?', { leaf: 'Leaf green with a pale throat.', gold: 'Ochre and olive markings.', blue: 'Blue-green with dark flecks.', russet: 'Earthy reddish brown.' }),
    posture: choice('What posture does it hold?', { crouch: 'Crouched low with tucked hind legs.', alert: 'Front legs hold the head up.', leap: 'Hind legs extend behind in a swimming leap.' }),
    markings: score('How strongly is the skin patterned?', ['Smooth solid colour', 'A few irregular spots', 'Dense mottling and dorsal stripes']),
    eyes: choice('What colour have the lifted eyes?', { amber: 'Amber-gold eyes.', red: 'Red eyes.', black: 'Deep charcoal eyes.' }),
    calling: noul('Is a rounded vocal sac inflated under its throat?'),
    stone: noul('Does it sit on a small damp stone?'),
  },
  build(a, context) {
    const s = new Sculpture(context), length = 0.023 + a.size * 0.23, u = length / 2, skin = s.material({ leaf: '#879d68', gold: '#a6a070', blue: '#759da1', russet: '#a68a74' }[a.pigment]), belly = s.material('#cecba5'), dark = s.material('#53695b'), eye = s.material({ amber: '#c2b06c', red: '#be806a', black: '#5a655b' }[a.eyes]), floor = a.stone ? u * 0.18 : 0, y = floor + u * (a.posture === 'alert' ? 0.35 : 0.22);
    if (a.stone) s.ball([u * 0.88, u * 0.16, u * 0.72], [0, u * 0.15, 0], s.material('#a0aaa0', { flatShading: true }), 9);
    s.ball([u * 0.55, u * 0.29, u * 0.67], [0, y, -u * 0.13], skin, 18); s.ball([u * 0.55, u * 0.23, u * 0.4], [0, y + u * 0.09, u * 0.47], skin, 18); s.ball([u * 0.4, u * 0.08, u * 0.37], [0, y - u * 0.12, u * 0.52], belly, 16);
    for (const side of [-1, 1]) {
      s.ball([u * 0.16, u * 0.17, u * 0.15], [side * u * 0.36, y + u * 0.27, u * 0.5], skin, 14); s.ball([u * 0.09, u * 0.095, u * 0.04], [side * u * 0.36, y + u * 0.29, u * 0.637], eye, 12); s.ball([u * 0.02, u * 0.064, u * 0.017], [side * u * 0.36, y + u * 0.29, u * 0.67], dark, 10);
      const hip: [number, number, number] = [side * u * 0.45, y, -u * 0.3], knee: [number, number, number] = [side * u * 0.85, floor + u * 0.16, -u * (a.posture === 'leap' ? 0.92 : 0.15)], heel: [number, number, number] = [side * u * (a.posture === 'leap' ? 0.75 : 0.62), floor + u * 0.06, -u * (a.posture === 'leap' ? 1.55 : 0.65)];
      s.rod(hip, knee, u * 0.22, skin, u * 0.15); s.rod(knee, heel, u * 0.11, skin, u * 0.05);
      const hand: [number, number, number] = [side * u * 0.65, floor + u * 0.03, u * 0.66]; s.tube([[side * u * 0.38, y, u * 0.38], [side * u * 0.62, floor + u * 0.15, u * 0.34], hand], u * 0.065, skin);
      for (const foot of [hand, heel]) {
        const toes: [number, number, number][] = [];
        for (let j = 0; j < 3; j++) { const tip: [number, number, number] = [foot[0] + (j - 1) * u * 0.13, floor + u * 0.015, foot[2] + (foot === hand ? 1 : -1) * u * (0.2 + (j === 1 ? 0.04 : 0))]; toes.push(tip); s.rod(foot, tip, u * 0.025, skin, u * 0.012); if (a.kind === 'tree') s.ball([u * 0.038, u * 0.013, u * 0.038], tip, skin, 8); }
        if (a.kind === 'pond') { const membrane = new THREE.BufferGeometry(); membrane.setAttribute('position', new THREE.Float32BufferAttribute([...foot, ...toes[0], ...toes[1], ...foot, ...toes[1], ...toes[2]], 3)); membrane.computeVertexNormals(); const web = skin.clone(); web.side = THREE.DoubleSide; s.mesh(membrane, web); }
      }
    }
    if (a.markings > 0.2 || a.kind === 'toad') for (let i = 0; i < 24; i++) { const t = i * 2.4, r = Math.sqrt((i + 0.5) / 24), x = Math.cos(t) * u * 0.47 * r, z = Math.sin(t) * u * 0.52 * r - u * 0.13; s.ball([u * 0.034, u * (a.kind === 'toad' ? 0.035 : 0.007), u * 0.027], [x, y + u * 0.29 * Math.sqrt(1 - r * r), z], a.kind === 'toad' ? skin : dark, 8); }
    if (a.calling) s.ball([u * 0.27, u * 0.24, u * 0.23], [0, y - u * 0.12, u * 0.85], belly, 16);
    s.tube([[-u * 0.32, y + u * 0.015, u * 0.72], [0, y - u * 0.01, u * 0.84], [u * 0.32, y + u * 0.015, u * 0.72]], u * 0.01, dark);
    return s.finish();
  },
});
