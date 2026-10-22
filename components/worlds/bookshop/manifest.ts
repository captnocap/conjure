import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'world',
  title: 'Bookshop',
  summary: 'An open-front bookshop with packed shelves, a reading corner and a small counter, browsing, unexpected discoveries and shelter among other peoples stories.',
  scales: ['room', 'street', 'tabletop'],
});
