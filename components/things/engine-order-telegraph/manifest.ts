import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Engine order telegraph',
  summary:
    'A brass ship\'s engine order telegraph on a column: a round dial painted FULL, HALF, SLOW, STOP with a lever handle to ring down orders to the engine room. The final instruction frozen, urgency, machinery obeying, a bridge in a crisis, steamships and ocean liners.',
  scales: ['room', 'tabletop', 'street'],
});
