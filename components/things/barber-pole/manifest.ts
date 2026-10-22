import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Barber pole',
  summary:
    'A freestanding barber pole on a cast pedestal, its striped helix turning inside a glass cylinder under a lit globe. Main-street haircuts, Saturday gossip, fathers and sons, a trade handed down, the one shop still open or the day it finally closed.',
  scales: ['street', 'room', 'tabletop'],
});
