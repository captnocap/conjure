import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Upright piano',
  summary:
    'A domestic upright piano against the wall with its stool, sheet music on the stand and family photographs, a metronome or nothing at all on top. Scales after school, hymns and Christmas, lessons nobody kept up, the heaviest thing in the house and the last to leave it.',
  scales: ['room', 'street', 'tabletop'],
});
