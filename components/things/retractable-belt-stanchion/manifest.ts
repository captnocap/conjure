import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Retractable belt stanchions',
  summary:
    'A set of queue posts with retractable belts, laid out as a lane, a closed-off zigzag or a cordon, belts taut, sagging or lying unhooked on the floor. Airports, banks, passport control, box offices: obedience, waiting your turn, a queue with nobody in it, an area you may not enter.',
  scales: ['room', 'street', 'tabletop'],
});
