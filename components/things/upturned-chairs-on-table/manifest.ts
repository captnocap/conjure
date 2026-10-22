import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Upturned chairs on a table',
  summary:
    'A laminate cafe table with its chairs flipped upside down on top, legs in the air and backs hanging over the edge, a wet-floor cone and a mop nearby, sometimes one chair still on the floor or a forgotten jacket. Closing time, cafes and canteens, the last customer gone, the end of the night.',
  scales: ['room', 'street', 'tabletop'],
});
