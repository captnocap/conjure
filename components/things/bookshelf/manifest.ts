import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Bookshelf',
  summary: 'A shelf of books, records or archival boxes with a few personal objects, private libraries, collections, study and accumulated lives.',
  scales: ['room', 'tabletop', 'street'],
});
