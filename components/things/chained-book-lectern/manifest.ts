import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Chained book on a lectern',
  summary:
    'A heavy bound volume on a reading stand, secured by an iron chain: open to a page, clasped shut, or gone with the chain cut. Monastic libraries, knowledge guarded and rationed, forbidden books, heresy, curses on thieves, a theft in the night.',
  scales: ['room', 'tabletop'],
});
