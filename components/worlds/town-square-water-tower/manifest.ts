import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'world',
  title: 'Town square with water tower',
  summary:
    'A one-block small-town square: brick storefronts on two sides, a lawn with crossing paths, and the town\'s name on a water tower rising behind the roofs. Civic pride, parades, boredom, everybody knowing everybody, Main Street at midday or golden hour, towns that are holding on or emptying out.',
  scales: ['street', 'landscape'],
});
