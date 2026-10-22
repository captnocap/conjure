import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Bouquiniste book box',
  summary:
    'A green riverside bookseller\'s box bolted to a stone quay parapet, lid propped open over rows of old books, prints and postcards, or padlocked shut. Browsing with nowhere to be, secondhand lives, a rainy afternoon by the Seine, slowness.',
  scales: ['street', 'room'],
});
