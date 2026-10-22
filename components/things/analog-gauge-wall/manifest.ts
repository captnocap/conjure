import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Analog gauge wall',
  summary:
    'A freestanding steel instrument panel of big round dial gauges, glass level indicators, valve handwheels and a painted mimic diagram of pipes and vessels. Boiler houses, ships\' engine rooms, power stations and waterworks; pressure held in check, needles steady in the green or pinned against the stop, the old trust in brass and glass.',
  scales: ['room', 'street', 'tabletop'],
});
