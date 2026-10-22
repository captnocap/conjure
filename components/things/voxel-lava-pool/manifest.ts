import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Voxel lava pool',
  summary:
    'A square-edged pool of glowing orange lava blocks rimmed with dark obsidian and stone cubes, a thread of smoke above it, sometimes a single stone block bridging it and a chest or dropped tool at the brink; or a cool blue water pool with a lily pad instead. Danger, heat, volcanic caves, the glow that lights a dark mine, sandbox games and toy worlds.',
  scales: ['street', 'room', 'tabletop', 'landscape'],
});
