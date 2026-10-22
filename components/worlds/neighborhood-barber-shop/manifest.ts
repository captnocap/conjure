import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'world',
  title: 'Neighborhood barber shop',
  summary:
    'The inside of a neighbourhood barber shop: a wall of mirrors over a long back-bar, a run of barber chairs facing a waiting side, tiled floor, and the street window throwing its light and lettering across the room. Dominican, Italian-American, Black, Turkish or Tokyo; a packed Saturday, the last cut of the night, or closed for good. Belonging, gossip, ritual, being looked after.',
  scales: ['room', 'street', 'tabletop'],
});
