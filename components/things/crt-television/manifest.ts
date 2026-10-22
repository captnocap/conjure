import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'CRT television',
  summary:
    'A boxy wood-grain CRT television with a bulging glass screen, channel dials, rabbit-ear antenna and a chained remote, on a dresser, cart or wall bracket, its screen flickering. Insomnia, company from a box, late-night reruns, the blue glow in a dark rented room.',
  scales: ['room', 'tabletop', 'street'],
});
