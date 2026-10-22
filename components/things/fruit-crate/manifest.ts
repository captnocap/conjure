import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Fruit crate',
  summary: 'A timber market crate of fruit or vegetables with stamped produce labels, harvest, grocery errands and food brought in from the countryside.',
  scales: ['tabletop', 'street', 'room'],
});
