import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Perpetual motion wheel',
  summary:
    'An overbalanced wheel of hinged weights in a glass-fronted cabinet, turning forever, or stopped with an apology card. Crank inventors, impossible machines, museum hoaxes, patent offices, stubborn hope against the laws of physics, a thing that should not work and says it does.',
  scales: ['room', 'tabletop', 'street'],
});
