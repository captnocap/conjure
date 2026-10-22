import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Tomato pincushion',
  summary:
    'A stuffed red tomato pincushion bristling with pins and needles, a strawberry emery dangling from its stalk. Domestic detail, small pains, mending, a mother\'s sewing basket, care taken one pinprick at a time.',
  scales: ['tabletop', 'macro', 'room'],
});
