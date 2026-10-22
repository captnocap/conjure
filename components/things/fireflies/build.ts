import * as THREE from 'three';
import { Sculpture, choice, score, noul, defineThing } from '@conjure/kit';

export default defineThing({
  questions: {
    gathering: choice('How do the fireflies gather?', { cloud: 'An irregular hovering cloud.', spiral: 'A loose ascending spiral.', pairs: 'Several close pairs exchanging signals.', branch: 'Most rest along a slender branching stem.' }),
    extent: score('How broad is their little gathering?', ['A hand-sized cluster', 'A bush-sized cloud', 'A broad garden swarm']),
    count: score('How many visible fireflies are there?', ['Four separate fireflies', 'A dozen fireflies', 'Many tiny fireflies']),
    lantern: choice('What colour are their lanterns?', { gold: 'Warm gold lanterns.', green: 'Yellow-green lanterns.', blue: 'Cool blue bioluminescent lanterns.' }),
    wings: noul('Are tiny wings extended on the flying insects?'),
    reeds: noul('Do three thin reeds rise beneath the swarm?'),
    pulse: choice('How do their lanterns pulse?', { steady: 'Constant glowing lanterns.', together: 'The cloud pulses in synchrony.', staggered: 'Individual lanterns blink at different phases.' }),
  },
  build(a, context) {
    const s = new Sculpture(context), span = 0.1 + a.extent * 1.9, n = 4 + Math.round(a.count * 26), bodySize = Math.min(0.014, span * 0.032), dark = s.material('#635e46'), stem = s.material('#7c8d55'), color = { gold: '#e6c46d', green: '#c5d780', blue: '#91c8dd' }[a.lantern], glow = s.material(color, { emissive: color, emissiveIntensity: 1.2 }), wing = s.material('#c5c9ab'), lamps: THREE.Mesh[] = [];
    if (a.reeds || a.gathering === 'branch') for (let i = 0; i < 3; i++) { const x = (i - 1) * span * 0.2, y = span * (0.62 + i * 0.15); s.tube([[x, 0, 0], [x + span * 0.03, y * 0.6, 0], [x + span * 0.1, y, 0]], span * 0.007, stem); s.ball([span * 0.013, span * 0.12, span * 0.013], [x + span * 0.1, y, 0], s.material('#967c50'), 8); }
    for (let i = 0; i < n; i++) {
      const f = i / n, t = i * 2.4, rr = span * (a.gathering === 'spiral' ? 0.35 : 0.12 + context.random() * 0.3), x = a.gathering === 'pairs' ? (Math.floor(i / 2) / Math.ceil(n / 2) - 0.5) * span + (i % 2) * bodySize * 4 : Math.cos(t) * rr, z = a.gathering === 'branch' ? 0 : Math.sin(t) * rr, y = span * (a.gathering === 'spiral' ? 0.15 + f * 0.9 : 0.18 + context.random() * 0.85);
      s.ball([bodySize * 0.45, bodySize * 0.35, bodySize], [x, y, z], dark, 8);
      const lamp = s.ball([bodySize * 0.56, bodySize * 0.45, bodySize * 0.55], [x, y, z - bodySize * 0.75], glow, 8); lamps.push(lamp);
      if (a.wings) for (const side of [-1, 1]) { const w = s.ball([bodySize * 0.9, bodySize * 0.05, bodySize * 0.5], [x + side * bodySize * 0.8, y + bodySize * 0.3, z], wing, 8); w.rotation.z = side * 0.35; }
      if (a.gathering === 'branch') s.rod([x, y, z], [0, y * 0.8, 0], span * 0.004, stem);
    }
    const lampScales = lamps.map((lamp) => lamp.scale.clone());
    return s.finish({ update: (_dt, time) => { if (a.pulse !== 'steady') lamps.forEach((lamp, i) => lamp.scale.copy(lampScales[i]).multiplyScalar(0.8 + 0.2 * Math.sin(time * 2 + (a.pulse === 'staggered' ? i * 1.7 : 0)))); } });
  },
});
