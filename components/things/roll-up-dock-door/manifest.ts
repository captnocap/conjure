import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Roll-up dock door',
  summary:
    'A loading bay door in a slab of warehouse wall, raised on a concrete dock with rubber bumpers, a painted bay number, a red and green signal and a sodium lamp. Shut, cracked open with light spilling under it, or gaping dark: arrivals, departures, goods in, and whatever waits behind.',
  scales: ['street', 'room', 'tabletop'],
});
