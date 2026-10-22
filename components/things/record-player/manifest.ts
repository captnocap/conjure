import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Record player',
  summary: 'A turntable, suitcase gramophone or stereo deck with a vinyl record, listening rooms, remembered songs and evenings spent with music.',
  scales: ['room', 'tabletop', 'street'],
});
