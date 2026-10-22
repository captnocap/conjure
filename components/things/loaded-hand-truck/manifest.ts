import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Loaded hand truck',
  summary:
    'An upright two-wheel dolly strapped with a tower of mismatched boxes, a lamp on top and a rolled rug up the side, squarely packed or about to go over. Moving day, one more trip, carrying a life by yourself, leaving in a hurry, the last load out of a storage unit.',
  scales: ['street', 'room', 'tabletop'],
});
