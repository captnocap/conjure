import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Riverside poem pavilion',
  summary:
    'A small open pavilion with upturned eaves perched on a rock, a stone table inside and a carved inscription tablet beside it. Somewhere built only for looking: friendship and wine, verses left by travellers, scholars in exile, a pause on a long journey.',
  scales: ['landscape', 'street', 'tabletop'],
});
