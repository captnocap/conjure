import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Ride-on floor scrubber',
  summary:
    'A ride-on floor scrubbing machine with a seat, steering wheel, spinning brushes and an amber beacon, trailing a wet shining stripe. The only thing moving at night in terminals, malls, hospitals and supermarkets: night shifts, invisible labour, the hum after closing time.',
  scales: ['room', 'street', 'tabletop'],
});
