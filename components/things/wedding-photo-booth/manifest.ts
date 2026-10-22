import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Wedding photo booth',
  summary:
    'A curtained photo booth with a lit header, a strip of four printed photos waiting in the delivery slot, feet showing under the curtain and a box of silly props: hats, moustaches on sticks, feather boas. Receptions, arcades, tipsy friends crammed in together, keepsakes, the one honest picture of the night.',
  scales: ['room', 'street', 'tabletop'],
});
