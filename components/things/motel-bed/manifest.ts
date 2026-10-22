import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Motel bed',
  summary:
    'A motel double bed with a quilted patterned bedspread, two flat pillows, a padded headboard bolted to a wall panel and a coin-operated vibrating-bed box. Exhaustion after a long drive, strangers, affairs, one-night stories, the night before something.',
  scales: ['room', 'tabletop'],
});
