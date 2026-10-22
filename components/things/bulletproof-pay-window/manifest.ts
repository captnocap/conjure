import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Bulletproof pay window',
  summary:
    'A thick acrylic cashier window in a framed booth, with a sliding steel tray, a speaker grille and notices taped to the glass. Pawn shops, check cashers, liquor stores, ticket offices and night stations: money passed under a barrier, distrust built into the furniture, a voice through a grille.',
  scales: ['room', 'street', 'tabletop'],
});
