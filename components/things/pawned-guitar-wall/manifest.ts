import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Pawned guitar wall',
  summary:
    'A slatwall panel hung with a row of electric and acoustic guitars on hooks, price tags dangling from the headstocks. Pawn shops, music stores, garage bands that broke up, rent that came due, a dream sold for forty dollars and still in tune.',
  scales: ['room', 'street', 'tabletop'],
});
