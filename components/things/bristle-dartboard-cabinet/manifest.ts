import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Dartboard cabinet',
  summary:
    'A bristle dartboard in a wooden wall cabinet with chalk scoreboard doors, on a slab of pocked panelling with a taped toe line on the floor. Pub leagues, friendly grudges, one more leg, steady hands after three pints, a back corner with its own rules.',
  scales: ['room', 'street', 'tabletop'],
});
