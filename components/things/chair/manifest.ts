import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Chair',
  summary:
    'A single chair, from a farmhouse Windsor or a bentwood café chair to a throne, a Chesterfield or a moulded plastic classic. An empty seat: waiting, absence, rest, authority.',
  // Wraps a builder from the Three.js ateliers repository; offered only when it is linked in.
  requires: ['ateliers'],
  scales: ['room', 'street', 'tabletop'],
});
