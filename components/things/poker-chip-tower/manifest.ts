import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Poker chip tower',
  summary:
    'A close study of casino chips on baize: tall striped stacks, a toppled column, a fan of cards and a dealer button. Winning streaks and last chips, going all in, bluffing, nervous fingers riffling a stack, fortunes counted in coloured clay.',
  scales: ['tabletop', 'macro', 'room'],
});
