import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Voxel cube tree',
  summary:
    'A tree built from metre cubes: a square trunk and a canopy of stacked leaf blocks, oak, spruce, birch, blossom or a dead bare trunk, sometimes with a block chopped out or fruit and lanterns hanging in the leaves. Sandbox games, pixel art, toy landscapes, the first thing anyone builds on a new world.',
  scales: ['street', 'landscape', 'tabletop'],
});
