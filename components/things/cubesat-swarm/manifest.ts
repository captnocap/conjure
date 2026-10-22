import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Cubesat swarm',
  summary:
    'A scattered flock of shoebox satellites with spring-tape antennas and tiny solar faces, some still blinking and some tumbling dead. Cheap space, student missions, megaconstellations, orbital clutter, a crowd of small machines doing their best.',
  scales: ['planetary', 'cosmic', 'landscape', 'tabletop', 'macro'],
});
