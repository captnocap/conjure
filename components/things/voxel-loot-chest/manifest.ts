import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Voxel loot chest',
  summary:
    'A wooden cube chest with an iron latch, lid closed or thrown open, gold ingots, glowing gems, bread, bones or nothing spilling out, single or double-wide, on a stone plinth, in grass or half-buried in sand. Treasure, reward, a cave\'s secret, dungeon loot, sandbox games, the toy-box version of greed.',
  scales: ['room', 'tabletop', 'street'],
});
