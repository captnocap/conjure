import * as THREE from 'three';
import { Sculpture, choice, score, noul, defineThing } from '@conjure/kit';

export default defineThing({
  questions: {
    profile: choice('What shape has the opening?', { round: 'A clean rounded arch.', pointed: 'A tall pointed ice gateway.', bridge: 'A low broad frozen bridge.' }),
    size: score('How large is the ice formation?', ['A walk-through ice arch', 'A tall shore formation', 'A monumental glacier arch']),
    tint: choice('What colour is the dense ice?', { blue: 'Deep glacier blue.', cyan: 'Pale turquoise.', white: 'Opaque white frost.', lavender: 'Lavender polar ice.' }),
    thickness: score('How thick are the arch shoulders?', ['A delicate narrow arch', 'Substantial icy pillars', 'Heavy glacier shoulders']),
    icicles: noul('Do long icicles hang from the arch ceiling?'),
    fractures: noul('Are dark blue fracture seams visible in the ice?'),
    snow: noul('Does fresh snow rest on the upper surface?'),
    feet: choice('What surrounds the feet?', { bare: 'Only the ice pillars.', rubble: 'Broken chunks of blue ice.', water: 'A shallow meltwater patch.' }),
  },
  build(a, context) {
    const s = new Sculpture(context), r = 2.4 + a.size * 24, tube = r * (0.14 + a.thickness * 0.18), ice = s.material({ blue: '#709db9', cyan: '#a6cbcc', white: '#d9e2dc', lavender: '#adb9d0' }[a.tint], { roughness: 0.35, flatShading: true }), pale = s.material('#e3e8df'), dark = s.material('#668aa2'), heightScale = a.profile === 'pointed' ? 1.35 : a.profile === 'bridge' ? 0.56 : 1;
    const arch = s.ring(r, tube, [0, tube, 0], ice, Math.PI); arch.scale.y = heightScale; arch.scale.z = 1.5;
    for (const side of [-1, 1]) s.ball([tube * 1.5, tube * 0.65, tube * 1.8], [side * r, tube * 0.55, 0], ice, 7);
    if (a.icicles) for (let i = 0; i < 15; i++) { const t = 0.22 + i / 14 * (Math.PI - 0.44), x = Math.cos(t) * (r - tube * 0.45), y = tube + Math.sin(t) * (r - tube * 0.5) * heightScale, length = tube * (0.5 + context.random() * 1.8); s.cylinder(tube * 0.11, 0, length, [x, y - length / 2, tube * 0.3], pale, 6); }
    if (a.snow) for (let i = 0; i < 12; i++) { const t = i * Math.PI / 11; s.ball([tube * 0.85, tube * 0.2, tube * 1.2], [Math.cos(t) * r, tube + Math.sin(t) * (r + tube * 0.9) * heightScale, 0], pale, 10); }
    if (a.fractures) for (let i = 0; i < 6; i++) { const t = 0.3 + i * 0.48; s.tube([[Math.cos(t) * (r - tube * 0.6), tube + Math.sin(t) * (r - tube * 0.6) * heightScale, tube * 1.43], [Math.cos(t + 0.07) * r, tube + Math.sin(t + 0.07) * r * heightScale, tube * 1.52], [Math.cos(t - 0.03) * (r + tube * 0.7), tube + Math.sin(t - 0.03) * (r + tube * 0.7) * heightScale, tube * 1.2]], tube * 0.022, dark); }
    if (a.feet === 'rubble') for (let i = 0; i < 9; i++) { const t = i * 2.4; const b = s.ball([tube * 0.7, tube * 0.4, tube * 0.6], [Math.cos(t) * r * 1.18, tube * 0.35, Math.sin(t) * tube * 2.4], ice, 5); b.rotation.z = context.random(); }
    if (a.feet === 'water') { const pool = s.cylinder(r * 0.85, r * 0.85, tube * 0.035, [0, tube * 0.02, tube], s.material('#8fb4ba', { roughness: 0.2 }), 32); pool.scale.z = 0.65; }
    return s.finish();
  },
});
