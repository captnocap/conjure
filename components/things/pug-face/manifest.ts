import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Pug face',
  summary:
    'A flat-faced little dog seen head and chest on: wrinkled black mask, bulging wide-set eyes, a nose roll and a curl of tongue. Lap dogs, snoring, waiting rooms and sofas, devotion that wheezes, a small worried patient being brave.',
  scales: ['room', 'tabletop', 'street'],
});
