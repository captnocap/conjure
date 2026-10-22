import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Take-a-number dispenser',
  summary:
    'A red snail-shaped ticket dispenser with a paper number hanging from its mouth, under a NOW SERVING digit display. Deli counters, pharmacies, licence offices, bakeries on Saturday: fairness by queue, impatience, being number 61 when they are calling 14.',
  scales: ['room', 'street', 'tabletop'],
});
