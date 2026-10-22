import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Now serving: eternity',
  summary:
    'A wall-mounted red LED NOW SERVING display on a bracket, a ticket dispenser under it with its paper tail curling to the floor, and a number nobody will ever reach. Queues, bureaucracy, deli counters, clinics, the DMV, purgatory, eternity measured in paper.',
  scales: ['room', 'street', 'tabletop'],
});
