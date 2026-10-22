import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Shoebox of photographs',
  summary:
    'An open shoebox crammed with loose family snapshots and slides, a few framed portraits propped beside it, priced by the handful. Estate sales, flea markets, house clearances; strangers\' weddings and babies, memory with nobody left to hold it, the face someone cut out.',
  scales: ['tabletop', 'room', 'macro'],
});
