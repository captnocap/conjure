import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Bulldog on a tasselled cushion',
  summary:
    'A squat bulldog lying on a fringed velvet cushion, jowls spread, one eye open, slowly breathing. Guilty or fast asleep, brindle, white or fawn, in a collar or a knitted sweater. Dog farts and the windy-dog joke, lazy afternoons, pubs, shops, bachelor pads and grandmothers\' front rooms, loyal and unbothered company.',
  scales: ['room', 'street', 'tabletop'],
});
