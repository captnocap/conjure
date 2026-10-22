import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Revolving bolt bin',
  summary:
    'An octagonal rotating steel cabinet of pie-slice drawers full of screws, nuts and washers, sold loose by the scoop into paper bags. Old hardware stores, garages, the one odd bolt you needed, patient counting, grandfathers who never threw a fastener away.',
  scales: ['room', 'tabletop', 'street'],
});
