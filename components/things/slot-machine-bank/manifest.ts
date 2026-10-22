import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Slot machine bank',
  summary:
    'A back-to-back bank of slot machines with lit toppers, reel windows, pull levers and stools. Casino floors, lucky streaks and near misses, pensioners feeding coins at 4am, the jingle of a jackpot nobody else looks up for.',
  scales: ['room', 'street', 'tabletop'],
});
