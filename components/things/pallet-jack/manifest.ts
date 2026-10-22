import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Pallet jack',
  summary:
    'A hand pallet truck with its long tiller and twin forks under a shrink-wrapped pallet of cartons, caught mid-restock. Night crews, loading docks, warehouses and stockrooms, work left half done, the unseen labour that fills the shelves before anyone wakes.',
  scales: ['room', 'street'],
});
