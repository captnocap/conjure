import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Spore thurible',
  summary:
    'A great hanging censer on chains, grown over with puffballs and breathing out a slow cloud of glowing spores as it swings. Fungal liturgy, incense turned to rot, a rite that carries on with nobody there, decay as devotion, hush and awe.',
  scales: ['room', 'street', 'tabletop', 'macro'],
});
