import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'world',
  title: 'Flower shop',
  summary: 'A florist shop with stepped buckets, cut flowers, wrapping counter and a glass doorway, bouquets for beginnings, celebrations and difficult goodbyes.',
  scales: ['room', 'street', 'tabletop'],
});
