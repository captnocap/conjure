import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Teletype machine',
  summary:
    'A wire-service teleprinter on a stand, chattering out a long ribbon of yellow paper into a basket, bulletin bell and lamp on top, torn-off stories pinned nearby. News arriving from far away: war and armistice, election returns, racing results, a flash that empties the room, a dead line.',
  scales: ['room', 'tabletop', 'street'],
});
