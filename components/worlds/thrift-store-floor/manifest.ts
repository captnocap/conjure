import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'world',
  title: 'Thrift store floor',
  summary:
    'The sales floor of a big charity shop seen as an open-corner diorama: mismatched strip lights, rows of clothing racks, shelves of housewares and a corner of unsold furniture. Rummage sales, estate sales, recycle shops; other people\'s lives priced with stickers, bargains, grief turned into inventory, second chances.',
  scales: ['room', 'street'],
});
