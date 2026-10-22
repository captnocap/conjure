import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Apothecary drawer cabinet',
  summary:
    'A tall wooden cabinet of many small labelled drawers with brass pulls, with jars, a balance scale or strange glassware on top. Chinese herbal shops, Victorian chemists, alchemists and wizards, museums and studies: old remedies, secrets sorted into compartments, patience, the smell of roots and dust.',
  scales: ['room', 'tabletop', 'street'],
});
