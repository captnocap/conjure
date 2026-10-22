import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Rolled-up carpet',
  summary:
    'A room-sized rug rolled up and tied with twine, its pattern showing in the spiral at the end, lying on the paler ghost it left on the floor. Moving out, the room a family lived on for thirty years, bare boards underfoot, something heavy that two people carried in and two will carry out.',
  scales: ['room', 'street', 'tabletop'],
});
