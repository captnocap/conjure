import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Rotary desk phone',
  summary:
    'A heavy rotary-dial telephone, or a small bank of them, with a coiled cord and a scribbled message pad. On the hook, ringing, or the receiver left off and dangling. The call that changes the story: a tip-off, bad news at 3 a.m., a hotline, waiting by the phone, a hang-up, a number never dialled.',
  scales: ['tabletop', 'room', 'macro'],
});
