import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'world',
  title: 'Voxel block hillside',
  summary:
    'A landscape of metre cubes: a stepped grassy hill with a sheer dirt cliff, a square-edged pond, cubic clouds in a flat blue sky and a strip of stone and glowing ore at the cut edge, seen from a raised three-quarter view so the blocks read as terraces. Sandbox games, childhood afternoons of building and digging, the calm of a countable world; at night a deep blue sky with square stars and a square moon.',
  scales: ['street', 'landscape', 'tabletop'],
});
