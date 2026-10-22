import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Prescription pickup window',
  summary:
    'A raised pharmacy counter bay with privacy dividers, an overhead pick-up sign and shelves of white bottles behind, sometimes shut behind a roll-down grille. Waiting for your name, bad news handed over politely, care behind glass, the last lit counter in a closed store.',
  scales: ['room', 'street'],
});
