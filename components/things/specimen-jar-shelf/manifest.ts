import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Specimen jar shelf',
  summary:
    'A shelf unit crowded with glass jars of preserved specimens floating in tinted fluid, each with a handwritten label. Medical teaching collections, cabinets of curiosities, natural history stores, mad-science basements; curiosity, unease, things kept long after they stopped living.',
  scales: ['room', 'tabletop', 'street'],
});
