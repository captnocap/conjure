import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Noodle broth cauldron',
  summary:
    'A big dented stockpot of broth on a gas ring, with a ladle, noodle baskets hooked on the rim and a column of steam. The heart of a street stall: cheap warmth, long simmering hours, hunger in the rain, a cook who never sits down.',
  scales: ['room', 'street', 'tabletop'],
});
