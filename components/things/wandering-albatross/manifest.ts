import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Wandering albatross',
  summary:
    'A great albatross on enormous stiff narrow wings, skimming a wave with one wingtip almost in the water, or sitting on the sea like a small white boat. Endless journeys, sailors’ omens, solitude without loneliness, effortless freedom over the Southern Ocean.',
  scales: ['street', 'room', 'landscape'],
});
