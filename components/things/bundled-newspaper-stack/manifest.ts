import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Bundled newspaper stack',
  summary:
    'Chest-high columns of newspapers and magazines tied with twine, yellowing from top to bottom, one column starting to slump. Hoarded hallways, attics, a recluse, time that was meant to be read someday, decades kept because throwing them out felt like losing them.',
  scales: ['room', 'street', 'tabletop'],
});
