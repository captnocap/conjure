import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Gate seating row',
  summary:
    'A beam-mounted row of airport seats with fixed armrests, sometimes holding a coat, a neck pillow, a cold coffee or a sleeping traveller. Departure lounges, bus stations, waiting rooms, delays, layovers, the body trying to rest somewhere built to prevent it.',
  scales: ['room', 'street', 'tabletop'],
});
