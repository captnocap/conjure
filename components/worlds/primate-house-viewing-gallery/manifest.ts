import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'world',
  title: 'Primate house viewing gallery',
  summary:
    'The public side of an old zoo primate house: glazed tile, a brass handrail, thick glass-fronted enclosures with painted jungle murals, concrete ledges and rope behind. School trips, being stared back at, captivity, boredom and kinship, feeding-time uproar or closing-time gloom.',
  scales: ['room', 'street'],
});
