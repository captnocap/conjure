import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Water cooler',
  summary:
    'An office water cooler: an upturned blue bottle on a white stand with two taps and a paper cone dispenser. Gossip, small talk, pauses stolen from work, waiting rooms, rumours of layoffs, the glug of a bubble in a silent corridor.',
  scales: ['room', 'street', 'tabletop'],
});
