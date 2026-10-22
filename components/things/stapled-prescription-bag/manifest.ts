import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Stapled prescription bag',
  summary:
    'A white paper pharmacy bag with a stapled receipt and name label, standing on a stub of counter with an amber pill bottle beside it. Illness and recovery, errands for someone you love, a diagnosis made ordinary, medicine nobody came to collect.',
  scales: ['tabletop', 'room', 'macro'],
});
