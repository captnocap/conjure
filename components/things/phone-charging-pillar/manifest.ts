import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Phone charging pillar',
  summary:
    'A branded public charging column with sockets and dangling cables around a small standing shelf, one phone left plugged in and glowing. Airports, stations, malls and hospital lobbies: waiting tethered to a wall, a dying battery, a message not yet answered.',
  scales: ['room', 'street', 'tabletop'],
});
