import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Bar stool row',
  summary:
    'A short run of bar front with a brass foot rail and three or four mismatched stools, and what the last drinkers left on the counter. Regulars and their seats, last call, someone who just walked out, drinking alone, a place held for a friend who is not coming.',
  scales: ['room', 'street', 'tabletop'],
});
