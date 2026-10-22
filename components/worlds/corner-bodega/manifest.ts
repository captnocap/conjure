import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'world',
  title: 'Corner bodega',
  summary:
    'A tight city corner store cut open: one narrow aisle between overstuffed shelves, a deli counter at the back, goods hanging from every ceiling clip, awning light through the open door. A New York bodega, Mexican tiendita, Manila sari-sari, Tokyo shotengai shop or British off-licence; the block knowing your name, credit until Friday, 2 a.m. sandwiches, a whole neighbourhood in forty square metres.',
  scales: ['room', 'street'],
});
