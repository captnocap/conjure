import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Convex safety mirror',
  summary:
    'A big round convex traffic mirror on a striped pole, holding a warped fisheye reflection of what is round the corner. Blind bends, car parks and loading bays, watchfulness, seeing something coming before it sees you, a small bulging world with nobody in it.',
  scales: ['street', 'room', 'tabletop'],
});
