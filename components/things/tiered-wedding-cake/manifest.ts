import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Tiered wedding cake',
  summary:
    'A multi-tier wedding cake on a silver stand and a draped round table, with a knife beside it and a topper on the summit. Receptions, vows, the first slice, expense and ceremony, the best day or the one that went wrong, a cake nobody finished.',
  scales: ['room', 'tabletop', 'street'],
});
