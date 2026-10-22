import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Split-flap departure board',
  summary:
    'A freestanding split-flap departures board: rows of clattering letter tiles spelling times, destinations and ON TIME, DELAYED or CANCELLED. Airports and railway halls, missed connections, waiting for news, fate announced one flap at a time, everywhere you are not going.',
  scales: ['room', 'street', 'tabletop'],
});
