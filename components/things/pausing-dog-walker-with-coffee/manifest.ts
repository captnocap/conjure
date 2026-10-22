import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Dog walker pausing with a coffee',
  summary:
    'A woman in a long coat and scarf stopped mid-path with a takeaway coffee in one hand and a leash in the other running to a small dog at her feet, her head turned toward something off to the side. Mornings, curiosity, the neighbour you only know by the dog, parks and pavements, the routine walk interrupted.',
  scales: ['street', 'room', 'tabletop'],
});
