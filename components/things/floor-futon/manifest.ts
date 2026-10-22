import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Floor futon',
  summary:
    'A mattress laid straight on the floorboards with a twisted duvet, one flat pillow and a phone charging at its edge; made, slept-in, or holding a duvet-shaped lump. First flats, starting over after a breakup, insomnia, broke twenties, a life with no bed frame yet.',
  scales: ['room', 'tabletop'],
});
