import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Whiskered cat snout',
  summary:
    'A cat face close in: nose leather, whisker pads with long whiskers, eyes whose pupils run from noon slits to black saucers, and ears that say everything. Windowsills, alley toms, vet tables, 3 a.m. zoomies, judgement, a hiss, a slow blink of trust.',
  scales: ['room', 'tabletop', 'street', 'macro'],
});
