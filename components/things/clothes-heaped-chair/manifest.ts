import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Clothes-heaped chair',
  summary:
    'A desk chair entirely buried under worn-once clothes: jeans legs hanging to the floor, a jacket over the back, a bag strap and one stray shoe. The chair nobody sits in, procrastination, getting ready and changing your mind, a life in mid-change.',
  scales: ['room', 'tabletop'],
});
