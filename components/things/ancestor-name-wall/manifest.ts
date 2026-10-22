import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Ancestor name wall',
  summary:
    'A standing wall of etched metal panels listing generation after generation of names, with fresh flowers, ribbons and small tokens tucked into its seams. Memorials, lineage, colony ships and old villages, grief made orderly, the duty of remembering people you never met.',
  scales: ['room', 'street', 'landscape'],
});
