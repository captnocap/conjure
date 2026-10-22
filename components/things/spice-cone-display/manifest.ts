import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Spice cone display',
  summary:
    'A souk stall counter of ground spice heaped into tall smooth cones of turmeric, paprika, cumin and indigo, with scoops, a balance and paper twists. Abundance, appetite, colour as commerce, a smell you can almost see.',
  scales: ['street', 'room', 'tabletop'],
});
