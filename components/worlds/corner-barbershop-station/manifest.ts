import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'world',
  title: 'Corner barbershop station',
  summary:
    'One station of an old neighbourhood barbershop: checkerboard lino, a long mirror over a shelf of bottles, a sink, a wall of faded haircut posters and a window onto the street. Weekly ritual, gossip, fathers and sons, straight razors and talcum, the last independent shop on the block, busy on a Saturday or closed for good.',
  scales: ['room', 'street', 'tabletop'],
});
