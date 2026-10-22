import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Farm windpump',
  summary:
    'A many-bladed steel windmill on a lattice tower, pumping into a round stock tank, the maker’s name on its tail vane. Dry plains, ranches and homesteads, creaking in the wind, water as the difference between staying and leaving.',
  scales: ['landscape', 'street'],
});
