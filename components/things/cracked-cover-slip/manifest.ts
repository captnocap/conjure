import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Cracked cover slip',
  summary:
    'A square glass cover slip on a microscope slide, intact or cracked corner to corner, with a trapped air bubble and a dried ring of stain beneath it: a glass roof at macro scale. Fragility, a ruined sample, clumsy first attempts in a school lab, pressing too hard, the thing you were trying to see.',
  scales: ['macro', 'tabletop'],
});
