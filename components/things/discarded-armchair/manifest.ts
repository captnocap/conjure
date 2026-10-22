import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Discarded armchair',
  summary:
    'A once-fine upholstered armchair thrown out and left, stuffing bursting from its arms, still somehow dignified: floral chintz, a leather wingback, a velvet recliner. Kerbsides, tips and empty flats; a grandparent, a house cleared, things once loved, a throne for whoever finds it.',
  scales: ['street', 'room', 'tabletop'],
});
