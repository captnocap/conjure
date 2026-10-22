import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'world',
  title: 'Natural history habitat case',
  summary:
    'A dim old museum hall dominated by one large glass-fronted habitat diorama: curved painted backdrop, plaster rocks and dried grass, a heavy frame with a brass label rail and a bench facing it. Specimens stand inside the case under its hidden strip light, with more on plinths in the hall. Frozen time, colonial collecting, dust, childhood awe and unease at what was killed to be looked at.',
  scales: ['room', 'tabletop', 'street'],
});
