import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Wagging dog tail',
  summary:
    'Only the back end of a dog: hind legs and a tail sticking out from under a chair, through a pet flap or out of a carrier, the rest hidden. The tail says it all: frantic joy, a slow hopeful sweep, tucked fear at the vet, something knocked flying. Hide and seek, waiting rooms, guilt, welcome home.',
  scales: ['room', 'street', 'tabletop'],
});
