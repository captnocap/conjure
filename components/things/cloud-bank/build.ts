import * as THREE from 'three';
import { Sculpture, choice, score, noul, defineThing } from '@conjure/kit';

export default defineThing({
  questions: {
    formation: choice('What cloud formation is it?', { cumulus: 'Rounded cauliflower cumulus towers.', stratus: 'A broad low rolling stratus bank.', cirrus: 'Long delicate hooked cirrus ribbons.', anvil: 'A tall thunderhead with an anvil top.' }),
    span: score('How wide is the cloud fragment?', ['A small isolated cloud', 'A broad cloud bank', 'A large wall of cloud']),
    layers: score('How many tiers form the cloud?', ['One low layer', 'Several overlapping tiers', 'Tall stacked towers']),
    tint: choice('How are the cloud surfaces coloured?', { cream: 'Soft cream and white.', rose: 'Pale pink and peach.', slate: 'Blue-grey and silver.', lilac: 'Lavender and pearl.' }),
    underside: noul('Is a darker flat underside visible?'),
    gaps: noul('Are there clear gaps between separate cloud clusters?'),
    streaks: noul('Do thin trailing streamers stretch from the cloud?'),
  },
  build(a, context) {
    const s = new Sculpture(context), span = 35 + a.span * 700, color = { cream: '#e5e3d6', rose: '#dac4bf', slate: '#b4c1ca', lilac: '#cac7dc' }[a.tint], cloud = s.material(color), shadow = s.material('#aab5bc'), tiers = 1 + Math.round(a.layers * 3);
    if (a.formation === 'cirrus') {
      for (let i = 0; i < 7; i++) { const y = span * (0.035 + i * 0.018), z = (i - 3) * span * 0.04, pts: [number, number, number][] = [[-span * 0.5, y, z], [-span * 0.25, y + span * 0.015, z], [span * 0.1, y + span * 0.03, z + span * 0.03], [span * 0.4, y + span * 0.09, z + span * 0.05], [span * 0.48, y + span * 0.14, z]]; s.tube(pts, span * 0.012 * (1 - i * 0.06), cloud); }
    } else {
      for (let layer = 0; layer < tiers; layer++) for (let i = 0; i < 13; i++) {
        if (a.gaps && (i === 4 || i === 8)) continue;
        const x = (i / 12 - 0.5) * span * (1 - layer * 0.16), z = (context.random() - 0.5) * span * 0.28, radius = span * (0.09 + context.random() * 0.045), y = radius * 0.45 + layer * span * (a.formation === 'stratus' ? 0.045 : 0.11);
        s.ball([radius * 1.15, radius * (a.formation === 'stratus' ? 0.45 : 0.82), radius], [x, y, z], cloud, 16);
      }
      if (a.formation === 'anvil') { for (let i = 0; i < 8; i++) s.ball([span * 0.16, span * 0.05, span * 0.15], [(i - 3.5) * span * 0.12, span * 0.45, 0], cloud, 16); }
      if (a.underside) s.ball([span * 0.47, span * 0.025, span * 0.17], [0, span * 0.015, 0], shadow, 20);
    }
    if (a.streaks) for (let i = 0; i < 5; i++) s.tube([[span * 0.25, span * 0.09, (i - 2) * span * 0.05], [span * 0.55, span * 0.07, (i - 2) * span * 0.06], [span * 0.72, span * 0.04, (i - 2) * span * 0.08]], span * 0.008, cloud);
    return s.finish();
  },
});
