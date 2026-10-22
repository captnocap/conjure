import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Kotatsu table',
  summary:
    'A low Japanese heated table with a thick patterned quilt skirt under a square top, floor cushions around it and an orange glow underneath. Winter evenings, family warmth, New Year television, grandparents, mandarins, the warm centre nobody is willing to leave.',
  scales: ['room', 'tabletop', 'street'],
});
