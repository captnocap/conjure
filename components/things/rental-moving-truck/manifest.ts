import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Rental moving truck',
  summary:
    'A box-body rental moving truck seen from its open rear: roll-up door raised, loading ramp down, furniture stacked inside and a generic painted mural along the side. Moving day, starting over, leaving a marriage or a town, do-it-yourself upheaval, everything you own in one rented box.',
  scales: ['street', 'landscape', 'tabletop'],
});
