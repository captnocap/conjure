import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Upright vacuum cleaner',
  summary:
    'An old upright bag vacuum with a cloth dust bag, a headlight and a long flex, standing exactly where it was last used. Housework abandoned midway, good intentions, a grandmother\'s hallway, dust winning, the chore that was going to be finished after a cup of tea.',
  scales: ['room', 'street', 'tabletop'],
});
