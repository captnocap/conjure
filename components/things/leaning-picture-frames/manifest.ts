import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Leaning picture frames',
  summary:
    'A handful of framed pictures and a mirror taken down and stacked leaning on the floor, some facing out, one wrapped in a blanket. A wedding portrait, a school photo, a print nobody chose; dividing up a family house, who gets what, bare hooks and pale rectangles left on the wall behind.',
  scales: ['room', 'street', 'tabletop'],
});
