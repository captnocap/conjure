import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Hand pallet truck',
  summary:
    'A hand pallet jack with long low forks, a hydraulic pump and a looped tiller handle in scuffed paint, empty or carrying a pallet. The humblest tool in logistics: stock rooms, night shifts, deliveries, warehouse aisles, work left half done.',
  scales: ['room', 'street', 'tabletop'],
});
