import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'world',
  title: 'Tokyo vending alley',
  summary:
    'A narrow Tokyo back alley at blue dusk seen down its length: a wall of glowing drink machines on one side, shuttered izakaya fronts on the other, signboards and a tangle of cables overhead, wet asphalt between. Solitude after the last train, quiet convenience, rain, the hum of compressors, being small in a huge city.',
  scales: ['street', 'room'],
});
