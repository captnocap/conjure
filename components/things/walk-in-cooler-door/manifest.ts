import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Walk-in cooler door',
  summary:
    'The heavy insulated door of a walk-in fridge with a lever latch, big hinges, a strip curtain and a dial thermometer, set in a slab of panel wall. Cold fog and light spilling out, a rota taped on, the one quiet place to scream or cry mid-shift, stock counts, a compressor failing in the night.',
  scales: ['room', 'street'],
});
