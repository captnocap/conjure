import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Medina donkey cart',
  summary:
    'A small two-wheeled wooden cart with a patient donkey in harness, piled with gas bottles, oranges, hides or rubble. Medina alleys, hard labour, old ways persisting beside the new, stubbornness, deliveries no van can make.',
  scales: ['street', 'landscape'],
});
