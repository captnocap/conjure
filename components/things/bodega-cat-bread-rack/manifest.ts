import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Bodega cat on the bread rack',
  summary:
    'A wire bread rack of bagged loaves and rolls with the shop cat occupying one shelf as if stocked there. Corner stores, an unofficial employee, warm bread at dawn and bare shelves by night, a neighbourhood that knows the cat by name.',
  scales: ['room', 'street', 'tabletop'],
});
