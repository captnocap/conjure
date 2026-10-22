import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'world',
  title: 'Hospital waiting room at night',
  summary:
    'A small hospital waiting room after visiting hours, cut away like a diorama: vinyl floor with a coloured way-finding stripe, a reception hatch with its shutter half down, a pinboard, a wall clock and double doors whose porthole windows glow at the back, under flat fluorescent panels with one warmer than the rest. Waiting for news, bargaining, vigils, time measured by a clock, kindness from strangers.',
  scales: ['room', 'street'],
});
