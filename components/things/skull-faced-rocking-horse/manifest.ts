import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Skull-faced rocking horse',
  summary:
    'A dapple-grey wooden rocking horse on bow rockers whose paint and gesso have fallen from the head, leaving something like a horse skull with one glass eye. Abandoned nurseries, toys that outlived their children, a pale horse in miniature, things that rock when nobody is there.',
  scales: ['room', 'street', 'tabletop'],
});
