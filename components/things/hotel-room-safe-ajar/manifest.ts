import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Hotel room safe, ajar',
  summary:
    'A small steel hotel safe with a keypad, set in a wardrobe cubby or on a shelf, its door swung open on a passport and cash, a pistol, a wrapped parcel, a wedding ring or nothing at all, with folded towels above and a laundry bag hanging off the edge. Secrets, travel, the things people lock away and the moment someone finds them.',
  scales: ['room', 'tabletop'],
});
