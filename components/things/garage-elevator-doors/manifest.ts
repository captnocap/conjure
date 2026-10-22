import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Garage elevator doors',
  summary:
    'A slab of car park wall holding brushed steel elevator doors, a call button, a floor indicator and a big painted level sign. Waiting alone for the lift, doors opening on an empty car, light spilling into concrete, thresholds, the hum before something arrives.',
  scales: ['street', 'room', 'tabletop'],
});
