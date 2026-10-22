import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Chipped mannequin',
  summary:
    'A secondhand shop mannequin on a steel base plate, dressed in a donated outfit from another decade, its paint chipped and a hand or wig not quite right. Thrift stores, tailors, attics, closed-down boutiques, the uncanny, being looked at, a body wearing someone else\'s life.',
  scales: ['room', 'street', 'tabletop'],
});
