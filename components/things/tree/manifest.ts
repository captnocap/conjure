import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Tree',
  summary:
    'One whole tree grown from a species, an age and a season: an ancient oak, a weeping willow, a cherry in blossom, a bare winter birch, a baobab. Time, shelter, memory, the seasons.',
  // Wraps a builder from the Three.js ateliers repository; offered only when it is linked in.
  requires: ['ateliers'],
  scales: ['street', 'landscape', 'room'],
});
