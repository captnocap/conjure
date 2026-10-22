import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Dressmaker form',
  summary:
    'A headless cloth dress form on a cast-iron tripod stand, bare with a tape measure draped round its neck or pinned with a half-made garment. Sewing rooms and attics, unfinished work, a mother\'s hands, a figure caught in the corner of your eye.',
  scales: ['room', 'tabletop', 'street'],
});
