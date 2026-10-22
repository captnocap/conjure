import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Stuffed toy bin',
  summary:
    'A wire cage bin heaped with secondhand plush animals, bears and rabbits and fairground prizes tangled face-up under a price sign. Thrift stores, outgrown childhoods, toys waiting to be chosen again, tenderness and abandonment at fifty cents each.',
  scales: ['room', 'street', 'tabletop'],
});
