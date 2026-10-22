import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'world',
  title: 'Dressmaker\'s sewing table',
  summary:
    'A worn cutting table in a home sewing room, spread with a length of cloth and a pinned paper pattern, a pegboard of notions and a window behind. Patience, making do, mothers and grandmothers, a garment for an occasion that is coming or never came.',
  scales: ['tabletop', 'room', 'macro'],
});
