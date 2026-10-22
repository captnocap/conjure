import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Dumpster',
  summary: 'A wheeled commercial refuse bin with ribbed steel, lids and discarded objects, back alleys, restaurant closings and the hidden side of a city.',
  scales: ['street', 'room', 'tabletop'],
});
