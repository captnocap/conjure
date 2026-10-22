import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Sofa',
  summary: 'An upholstered sofa with cushions, a blanket or books, shared living rooms, conversations, comfort and afternoons that turn into evenings.',
  scales: ['room', 'tabletop', 'street'],
});
