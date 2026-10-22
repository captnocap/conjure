import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Inverted chandelier',
  summary:
    'A crystal chandelier growing upward from the floor on its chain like a plant, candles hanging head-down and burning downward, crystals rising instead of dangling. Upside-down rooms, ballrooms after everyone has gone, gravity mislaid, grandeur in a dream, quiet wrongness.',
  scales: ['room', 'street'],
});
