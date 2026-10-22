import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Hydroponic grow column',
  summary:
    'A tall slowly turning tower of planting pockets fed by drip lines, with lettuces, herbs or tomato vines spilling out under a ring of pink grow-lights. Ship gardens, vertical farms, food grown without soil or sky, patient tending, a harvest that either feeds everyone or fails.',
  scales: ['room', 'street'],
});
