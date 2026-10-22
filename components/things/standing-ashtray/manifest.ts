import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Standing ashtray',
  summary:
    'A waist-high pedestal smoking stand with an amber glass bowl on a chrome stem, butts in the ash and a thread of smoke when one is still burning. Waiting rooms, uncles, bowling alleys and lobbies, time measured out in cigarettes.',
  scales: ['room', 'street', 'tabletop'],
});
