import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Coffee machine',
  summary: 'A countertop espresso maker or roadside coffee brewer with cups and steam-wand details, early shifts, small rituals and caffeine after midnight.',
  scales: ['room', 'tabletop', 'street'],
});
