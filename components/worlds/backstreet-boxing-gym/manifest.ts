import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'world',
  title: 'Backstreet boxing gym',
  summary:
    'A second-floor boxing gym in an old industrial neighbourhood, somewhere between Philadelphia and Havana: bare boards, peeling paint, tall dusty windows throwing slabs of light, a raised ring in the back corner and brick walls papered in fight posters. Discipline, hunger, comebacks, old trainers, sweat and liniment, the hour before anyone else arrives.',
  scales: ['room', 'street', 'tabletop'],
});
