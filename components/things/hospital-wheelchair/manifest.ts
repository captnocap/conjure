import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Hospital wheelchair',
  summary:
    'A standard-issue folding wheelchair with a vinyl sling seat, big spoked wheels with push rims, small front castors and swing-away footplates. Waiting by a door for a discharge, folded against a wall, or holding a blanket and a visitor’s bag; frailty, being pushed, going home or not.',
  scales: ['room', 'street', 'tabletop'],
});
