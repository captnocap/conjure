import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Fight poster wall',
  summary:
    'A free-standing slab of old brick wall pasted thick with letterpress fight posters, a framed champion\'s photograph and a hand-painted gym rule above. Fight nights, local heroes, names nobody remembers, title shots and cancelled cards, Philadelphia or Havana, glory peeling off in layers.',
  scales: ['street', 'room'],
});
