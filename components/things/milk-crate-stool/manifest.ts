import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Milk-crate stool',
  summary:
    'An upturned plastic milk crate with a folded cardboard cushion, a coffee cup, a radio and a newspaper around it: someone\'s permanent post by the shop door. Old men on the block, the neighbourhood watch, ball games on AM radio, a seat kept warm for decades or left empty for good.',
  scales: ['street', 'room', 'tabletop'],
});
