import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Pawned wristwatch',
  summary:
    'A man\'s gold wristwatch taken off and laid down as a stake, strap curled, sometimes with a wedding ring, a pawn ticket or a creased photograph beside it. Desperation, the last thing of value, inheritance, time running out, a bet that should not have been made.',
  scales: ['tabletop', 'macro', 'room'],
});
