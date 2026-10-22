import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Capsule toy machine',
  summary:
    'Stacked gachapon machines with clear bins of coloured capsules, a crank, a coin slot and a prize chute. Childhood luck, pocket change, small wishes, arcades and station corridors, the one prize you never got.',
  scales: ['street', 'room', 'tabletop'],
});
