import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Overloaded coat rack',
  summary:
    'A bentwood hall stand that has vanished under layers of coats, scarves, umbrellas, carrier bags and three hats. Cluttered hallways, winter, a family or one person\'s forty years on a single peg, everyone who ever came in and the ones who never came back for their coat.',
  scales: ['room', 'street', 'tabletop'],
});
