import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Piano',
  summary: 'A piano with black-and-white keys, a music stand and bench, practice rooms, remembered melodies and music waiting for someone to sit down.',
  scales: ['room', 'street', 'tabletop'],
});
