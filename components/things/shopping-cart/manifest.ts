import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Shopping cart',
  summary: 'A wire grocery trolley with a child seat, loose groceries or abandoned belongings, ordinary errands, parking-lot loneliness and makeshift journeys.',
  scales: ['room', 'street', 'tabletop'],
});
