import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Rolled rug',
  summary:
    'A patterned rug rolled up and tied with string, its fringe and pale underside showing, propped in a corner or lying on bare boards. Moving out, the warmth of a room packed away, inheritance, a home reduced to things you can carry.',
  scales: ['room', 'street', 'tabletop'],
});
