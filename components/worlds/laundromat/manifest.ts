import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'world',
  title: 'Laundromat',
  summary: 'An open-front neighbourhood laundry with washer doors, folding counter and notices, late washing, waiting for a dryer and ordinary lives crossing briefly.',
  scales: ['room', 'street', 'tabletop'],
});
