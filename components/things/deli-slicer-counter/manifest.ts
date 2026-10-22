import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Deli slicer counter',
  summary:
    'A short glass-front deli case of meats and cheeses with a chrome slicer, a scale and a paper roll on top and a letter-board menu overhead. Bodega breakfasts, bacon egg and cheese at 2 a.m., a sandwich wrapped with your name on it, the counterman who knows your order.',
  scales: ['room', 'street'],
});
