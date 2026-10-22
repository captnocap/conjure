import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Tomb robbers\' kit',
  summary:
    'A dropped reed torch, a coil of rope, a copper chisel and mallet and a spilled sack of gold trinkets, left on the floor in a hurry. Trespass, greed, interruption, a crime scene three thousand years cold, someone ran and did not come back.',
  scales: ['room', 'tabletop', 'street'],
});
