import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: "Judge's bench",
  summary:
    "A raised, panelled judge's bench on a dais with a high-backed chair, gavel and block, water carafe and stacks of bound papers. Authority, sentencing, waiting to be told your fate, law as furniture; grand and carved or municipal and shabby, occupied or pointedly empty.",
  scales: ['room', 'street', 'tabletop'],
});
