import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'world',
  title: 'Pawn shop floor',
  summary:
    'A cramped pawn shop interior: glass counters in an L, walls hung floor to ceiling with other people\'s guitars, tools and televisions, a barred window throwing striped daylight or neon across the floor. Hard months, bargaining, objects with a past, things that were loved and let go.',
  scales: ['room', 'street', 'tabletop'],
});
