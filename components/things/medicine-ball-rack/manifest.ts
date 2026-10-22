import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Medicine ball rack',
  summary:
    'A low welded steel rack of stitched leather medicine balls in graded sizes, iron dumbbells, a coiled skipping rope and a wooden ab-roller. Old-school conditioning, roadwork and sit-ups, a trainer\'s routine, strength built from cheap heavy things, a gym before the mirrors and machines.',
  scales: ['room', 'street', 'tabletop'],
});
