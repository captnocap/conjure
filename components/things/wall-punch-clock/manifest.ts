import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Punch clock and card rack',
  summary:
    'A workplace time clock on a post with a rack of punch cards beside it, from brass mechanical to grey digital. Shift work, clocking in and out, lateness, counting the hours, factory gates, a walkout, the last card left in the rack.',
  scales: ['room', 'street'],
});
