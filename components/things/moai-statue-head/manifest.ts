import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Moai statue head',
  summary:
    'An Easter Island moai: a long heavy-browed stone face with pursed lips and a jutting chin, buried to the shoulders in a grassy slope or standing full height on a platform. Remote islands, ancestors keeping watch, vanished makers, patience on a geological scale, and the souvenir-shelf copy of all that.',
  scales: ['landscape', 'street', 'tabletop', 'room'],
});
