import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Bagged ice freezer',
  summary:
    'An outdoor ice merchandiser: a long white insulated chest with two slanted steel doors, frosty blue ICE lettering with painted icicles, and bags of cubes inside. Summer heat, fishing trips, tailgates and coolers in the truck bed, the compressor hum outside a store door at night.',
  scales: ['street', 'room', 'tabletop'],
});
