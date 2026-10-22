import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Stained lab notebook',
  summary:
    'An open bound notebook crowded with equations, apparatus sketches, tables and crossings-out, marked by coffee rings and chemical burns, a pencil lying in the gutter. Obsession, failed attempts, a breakthrough at three in the morning, homework, the private record of someone working something out.',
  scales: ['tabletop', 'macro', 'room'],
});
