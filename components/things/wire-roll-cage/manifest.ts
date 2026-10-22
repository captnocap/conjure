import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Wire roll cage',
  summary:
    'A tall wheeled wire cage trolley of the kind rolled off delivery lorries, full of parcels, laundry sacks, returns or flattened cardboard. Stock rooms, sorting offices, hospital corridors, supermarket back doors, night deliveries, the churn behind every shop.',
  scales: ['room', 'street', 'tabletop'],
});
