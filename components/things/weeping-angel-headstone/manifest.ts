import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Weeping angel headstone',
  summary:
    'A life-size stone angel bowed over a headstone, wings behind it and its face buried in its arm, or perhaps lifted and looking back. Victorian cemeteries, grief carved to last, lichen and ivy, offerings left at the base, and the uneasy feeling that the statue moved while you looked away.',
  scales: ['street', 'room', 'landscape'],
});
