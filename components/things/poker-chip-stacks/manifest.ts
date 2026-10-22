import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Poker chip stacks',
  summary:
    'Uneven towers and a toppled spill of striped clay poker chips in several colours, sometimes with a roll of cash or car keys thrown in. Greed, luck running hot or cold, casinos and back rooms, a winner\'s hoard or a loser\'s last few, going all in.',
  scales: ['tabletop', 'room', 'macro'],
});
