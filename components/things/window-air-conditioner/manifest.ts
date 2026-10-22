import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Motel air conditioner',
  summary:
    'A through-the-wall motel air conditioner and heater: a long beige louvred cabinet under a curtained window with a control flap, two knobs, a ribbon fluttering from the vent and a drip stain beneath. White noise, summer heat outside, sleepless afternoons, the smell of a rented room.',
  scales: ['room', 'street', 'tabletop'],
});
