import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Swivel office chair',
  summary:
    'A five-star castor office chair with a gas lift and worn arms, anywhere from executive leather to a broken-backed hand-me-down. Desk jobs, promotions and demotions, someone who just stepped away, a jacket left over the back, the empty seat after a layoff.',
  scales: ['room', 'street', 'tabletop'],
});
