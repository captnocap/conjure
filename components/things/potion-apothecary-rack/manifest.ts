import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Potion rack',
  summary:
    'A leaning wooden rack of corked bottles in odd shapes, full of glowing liquids, with wax seals and hand-inked labels. Witches, apothecaries and wizards, cures and poisons side by side, temptation, a shop of small miracles, and the one bottle that is missing or spilled.',
  scales: ['room', 'tabletop'],
});
