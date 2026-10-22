import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Crazy golf hole',
  summary:
    'One complete mini-golf hole: a rubber tee mat, a felt fairway between painted concrete kerbs, a steel loop-the-loop or another obstacle, and a flagged cup. Seaside crazy golf, family rivalry, first dates, the putt that almost went in, small stakes taken very seriously.',
  scales: ['street', 'room', 'tabletop'],
});
