import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Refrigerator',
  summary: 'A domestic refrigerator with magnets, food and a small light inside, shared kitchens, midnight hunger and the quiet inventory of a home.',
  scales: ['room', 'street', 'tabletop'],
});
