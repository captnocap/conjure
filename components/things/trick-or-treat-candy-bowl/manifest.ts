import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Trick-or-treat candy bowl',
  summary:
    'A big bowl heaped with fun-size candy bars, lollipops, candy corn and twist-wrapped sweets, sometimes with a hand-lettered TAKE ONE PLEASE card. Halloween doorsteps, the honour system, sticky small hands, a rubber spider lurking in the sugar, the last unwanted sweets at the end of the night.',
  scales: ['tabletop', 'room', 'street'],
});
