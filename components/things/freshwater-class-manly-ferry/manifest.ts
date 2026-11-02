import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Manly ferry',
  summary:
    'A big Freshwater-class Manly ferry: a 70-metre double-ended harbour boat with a green hull, cream decks with gold trim, wheelhouses at both ends, rows of saloon windows and a squat funnel. Commuting across Sydney Harbour, surfers and day-trippers, pitching through the swell at the Heads, salt spray and summer Sundays.',
  scales: ['landscape', 'street', 'tabletop'],
});
