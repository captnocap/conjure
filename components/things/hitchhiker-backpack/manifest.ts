import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Hitchhiker backpack',
  summary:
    'A worn backpack set down on the kerb with a rolled sleeping pad, a dangling tin mug and a hand-lettered cardboard sign propped against it. Leaving, running away, going home, hope on a thumb, waiting at the edge of the road for a stranger to stop.',
  scales: ['street', 'room', 'tabletop'],
});
