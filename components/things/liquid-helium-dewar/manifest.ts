import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Liquid helium dewar',
  summary:
    'A tall steel cryogenic dewar with frost rings round the neck, a valve tree and gauge on top, a vent plume drifting off and a hose trailing to the floor, on a wheeled dolly. Physics labs, cryogenics, MRI suites, cold stores and the far future: expensive cold, hissing quiet, careful hands, labels and stickers.',
  scales: ['room', 'street', 'tabletop'],
});
