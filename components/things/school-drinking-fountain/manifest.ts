import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'School drinking fountain',
  summary:
    'A wall-hung school drinking fountain on a slab of glazed tiles, with a bubbler, a push button and a low step for small children. Thirst after running, queues at break time, metallic lukewarm water, playground summers and a corridor gone quiet.',
  scales: ['room', 'street', 'tabletop'],
});
