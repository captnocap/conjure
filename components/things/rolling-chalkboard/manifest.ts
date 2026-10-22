import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Rolling chalkboard',
  summary:
    'A double-sided swivel chalkboard on a castored frame with a tray of chalk and a duster. Lessons and lectures, equations half understood, lines written in detention, a game of hangman on a wet afternoon, a farewell half wiped away on the last day of term.',
  scales: ['room', 'street', 'tabletop'],
});
