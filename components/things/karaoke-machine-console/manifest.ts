import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Karaoke machine console',
  summary:
    'A stacked karaoke unit: echo amplifier, song selector, two speakers and a screen showing a lyric line with a bouncing ball, or the score it just handed out. Private singing rooms, snack bars, office parties, heartbreak ballads at 3 a.m., a machine that judges you out of 100.',
  scales: ['room', 'tabletop', 'street'],
});
