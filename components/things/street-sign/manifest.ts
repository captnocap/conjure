import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Street sign',
  summary:
    'A road sign on its post, from the full signed corner to a lone STOP, DEAD END, deer crossing or bus stop, with real sheeting, stickers, rust and bullet holes. Rules, warnings, directions, the roadside.',
  // Wraps a builder from the Three.js ateliers repository; offered only when it is linked in.
  requires: ['ateliers'],
  scales: ['street', 'room'],
});
