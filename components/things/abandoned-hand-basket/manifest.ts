import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Abandoned hand basket',
  summary:
    'A plastic shopping basket left on the floor mid-shop, its few items telling who walked away: dinner for one, birthday candles, baby formula, wine and flowers. A phone call that changed the evening, a change of heart, loneliness, small private emergencies in public places.',
  scales: ['room', 'tabletop', 'street'],
});
