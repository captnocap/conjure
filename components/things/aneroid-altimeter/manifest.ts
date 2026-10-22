import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Aneroid altimeter',
  summary:
    'A brass-cased aneroid barometer and altimeter with a glass face and a fine blued needle, held in a leather strap cradle. Precision, expeditions and early flight, how high is too high, a small instrument trusted with a life.',
  scales: ['tabletop', 'macro', 'room'],
});
