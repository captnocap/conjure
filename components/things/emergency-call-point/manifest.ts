import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Emergency call point',
  summary:
    'A tall blue-lit help point pillar with a red button, a speaker grille and a beacon on top. Campuses, car parks and station platforms at night; reassurance that also names the danger, walking alone, the button you hope never to press.',
  scales: ['street', 'room', 'tabletop'],
});
