import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Mourner with an urn',
  summary:
    'A man in white at the water\'s edge, head freshly shaved, tipping a small brass urn so ash and marigold petals fall in a thin stream toward the ground, a relative\'s hand on his shoulder. Riversides, shores, graveyards and memorials; grief carried quietly, last rites, letting go, the morning after.',
  scales: ['street', 'room', 'tabletop'],
});
