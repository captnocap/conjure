import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Staircase',
  summary:
    'A free-standing architectural staircase that climbs to nothing: spiral, helical, floating, cantilevered or grand and imperial. Ascent, ambition, a threshold, somewhere unreachable.',
  // Wraps a builder from the Three.js ateliers repository; offered only when it is linked in.
  requires: ['ateliers'],
  scales: ['room', 'street'],
});
