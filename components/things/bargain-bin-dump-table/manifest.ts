import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Bargain bin dump table',
  summary:
    'A wire dump bin or trestle heaped with loose tapes, discs and rolled posters under a hand-made price sign. Closing-down sales, rummaging for treasure, everything a dollar, the last unwanted stock of a shop, the bottom of the barrel.',
  scales: ['room', 'street', 'tabletop'],
});
