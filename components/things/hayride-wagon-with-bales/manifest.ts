import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Hayride wagon',
  summary:
    'A flatbed farm wagon on fat rubber tyres, loaded with square hay bales for seats and waiting for a hayride. October weekends, pumpkin patches, cider and blankets, kids shrieking past the corn maze at dusk, small-town harvest festivals.',
  scales: ['street', 'landscape'],
});
