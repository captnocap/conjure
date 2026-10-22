import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Analog multimeter',
  summary:
    'A bakelite test meter with a swinging needle behind glass, a rotary range selector and red and black probe leads snaking away across the bench. Diagnosis and measurement, finding the fault, an electrician\'s or radio ham\'s trusted instrument, the moment of truth when the needle moves.',
  scales: ['tabletop', 'macro', 'room'],
});
