import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Fair ticket booth',
  summary:
    'A tiny peaked-roof ticket kiosk with a grilled window, a price board and a roll of tickets trailing off the counter. Fairgrounds, carnivals, the start of a night out, counting change, or a hand-lettered CLOSED sign after the season ends.',
  scales: ['street', 'room', 'tabletop'],
});
