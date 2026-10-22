import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Deep-sea ROV',
  summary:
    'A boxy remotely operated submersible: a yellow foam block over an open frame, with thrusters, lamps, a camera eye, a manipulator arm and a tether trailing back to the surface. Curiosity, science, intrusion, salvage, a machine working alone far from home or lost there.',
  scales: ['room', 'street', 'tabletop'],
});
