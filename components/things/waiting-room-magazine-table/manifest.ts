import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Waiting-room magazine table',
  summary:
    'A low laminate table fanned with out-of-date magazines, a rack of health leaflets, a box of tissues and a tub of worn children\'s bricks or a bead maze. Doctors, dentists, garages and solicitors: killing time, reading without reading, a child kept busy, an article abandoned when a name is called.',
  scales: ['room', 'tabletop'],
});
