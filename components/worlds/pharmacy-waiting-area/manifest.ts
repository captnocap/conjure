import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'world',
  title: 'Pharmacy waiting area',
  summary:
    'The back of a drugstore where the floor rises to a long dispensing counter, shelves of white bottles behind it and a small over-clean waiting zone in front. Waiting on news, care and age, errands for the sick, the fifteen minutes before a name is called; an old apothecary, a green-cross farmacia or a herbal dispensary, open, shuttered, or the only lit thing at night.',
  scales: ['room', 'street'],
});
