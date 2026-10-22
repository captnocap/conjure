import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Cash register',
  summary: 'A mechanical shop till or electronic checkout register with a cash drawer, keys and receipt, the last sale of the night and small-town commerce.',
  scales: ['room', 'street', 'tabletop'],
});
