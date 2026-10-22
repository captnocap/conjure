import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Boxing ring corner',
  summary:
    'One corner of a raised boxing ring: padded turnbuckle post, four ropes running off, canvas apron and steps, with a stool, spit bucket, water bottle and towel. The minute between rounds, cornermen, fights won or thrown in, the loneliest seat in sport.',
  scales: ['room', 'street', 'tabletop'],
});
