import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Shoeshine box',
  summary:
    'A wooden shoeshine box with a footrest, brushes, tins of polish and a rag laid out on a mat, a small stool beside it and one finished shoe waiting. A boot-polish boy on a station platform, child labour and dignity, pride in appearance, a small job done well for a stranger, coins in a tin lid.',
  scales: ['street', 'room', 'tabletop'],
});
