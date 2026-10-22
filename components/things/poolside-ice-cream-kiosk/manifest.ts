import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Poolside ice-cream kiosk',
  summary:
    'A small round refreshment kiosk with a striped canopy, a serving hatch, a giant fibreglass cone on the roof and a chalked price board. Lidos, piers and parks: pocket money, a queue of wet children, soft-serve and hot chips, wasps round the bin, or the shutter down out of season.',
  scales: ['street', 'tabletop'],
});
