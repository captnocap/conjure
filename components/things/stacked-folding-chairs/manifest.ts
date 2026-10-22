import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Folding chairs',
  summary:
    'A set of metal folding chairs: in rows facing a lectern, in a circle for a meeting, lined up at a graveside, or stacked on a rolling rack, with one chair set apart. Fellowship halls, recovery meetings, funerals and school gyms, waiting to be called, the seat nobody takes, setting up and putting away.',
  scales: ['room', 'street', 'tabletop'],
});
