import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Open box of kids’ cereal',
  summary:
    'A loud cartoon-mascot cereal box with its flap torn open, a bowl of milk with floating sugary pieces and more spilled across the table. Saturday morning cartoons, childhood, the hurry before school, latchkey kids, sugar and plastic prizes.',
  scales: ['tabletop', 'room', 'macro'],
});
