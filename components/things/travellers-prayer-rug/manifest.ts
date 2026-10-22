import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Traveller\'s prayer rug',
  summary:
    'A small worn knotted rug laid out on the ground with a water ewer and a pair of slippers set neatly beside it. Devotion far from home, one person\'s still point on the road, dawn and dusk at a caravan halt, humility, routine, a moment of quiet someone has just stepped out of.',
  scales: ['room', 'street', 'tabletop'],
});
