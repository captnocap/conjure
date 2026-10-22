import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Lemonade pitcher',
  summary:
    'A glass jug of lemonade with citrus slices and ice, beaded with condensation, and tumblers standing beside it. Hospitality, porch summers, a child\'s roadside stand, thirst on a hot afternoon, a drink poured for someone who has not come back yet.',
  scales: ['tabletop', 'room', 'macro'],
});
