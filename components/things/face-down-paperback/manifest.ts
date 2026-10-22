import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Face-down paperback',
  summary:
    'A cracked-spine paperback left open face down to keep the place, sunglasses resting across it and a pressed flower or ticket marking an earlier page. Leisure, holidays, dozing off in the sun, an interrupted afternoon, someone who will be back in a minute.',
  scales: ['tabletop', 'room', 'macro'],
});
