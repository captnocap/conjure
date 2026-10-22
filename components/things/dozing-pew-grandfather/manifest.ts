import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Grandfather dozing in a pew',
  summary:
    'An old man in a Sunday overcoat and tie asleep upright in a short pew, chin on chest, a hymn book sliding off his knee, his flat cap on the seat beside him; a pew with a hymn-book ledge and a kneeler. Long sermons, Sunday mornings, warmth after a cold walk, grandchildren, the dignity and comedy of old age, every ceremony that ran on too long.',
  scales: ['room', 'street', 'tabletop'],
});
