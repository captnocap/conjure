import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Boiling water cooler',
  summary:
    'An office water cooler whose big bottle is at a rolling boil and lit orange from within, steam coming off the taps, a sleeve of paper cones and a puddle at its foot. Offices, waiting rooms, gossip corners, purgatory, hospitality that hurts, the small comforts of institutions.',
  scales: ['room', 'tabletop', 'street'],
});
