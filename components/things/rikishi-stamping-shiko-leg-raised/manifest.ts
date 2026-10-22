import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Rikishi stamping shiko',
  summary:
    'A heavy sumo wrestler in nothing but a mawashi, mid-shiko: one leg raised high to the side with the foot flexed, both hands on the standing knee, torso tipped forward, topknot and bare feet. Training halls at dawn, strength as ritual, obedience and pain, slapped skin, a hundred stamps before breakfast, Japan.',
  scales: ['room', 'street', 'tabletop'],
});
