import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Boarding gate podium',
  summary:
    "The gate agent's desk: a counter with a yellow gate-number sign on a pole, a screen, a boarding-pass scanner, a gooseneck microphone and a monitor. Unstaffed, closed or lit for a final call. Airports, last chances, being told no politely, the threshold between staying and leaving.",
  scales: ['room', 'street', 'tabletop'],
});
