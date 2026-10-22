import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Steel luggage trunk',
  summary:
    'A painted steel travelling trunk with a hand-lettered name and address, bound with rope, a bedroll and a water bottle riding on top. Migration, leaving the village for the city, a soldier or a bride or a student going far away, everything you own in one box on a railway platform.',
  scales: ['street', 'room', 'tabletop'],
});
