import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Kitchen pass with heat lamps',
  summary:
    'A stainless restaurant pass: a plating shelf under hanging heat lamps, a ticket rail of order chits and a call bell. The border between cooks and guests; dinner rush, shouted orders, plates dying under the lamps, an empty rail after close.',
  scales: ['room', 'street', 'tabletop'],
});
