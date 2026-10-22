import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Stave church',
  summary:
    'A dark tarred Norwegian stave church: steep shingled roofs stacked one above another, dragon heads rearing from the gables and a thin spire. Medieval faith with something pagan still under it, Viking carving, long winters, endurance, a valley that has buried its dead in one place for eight hundred years.',
  scales: ['street', 'landscape', 'tabletop'],
});
