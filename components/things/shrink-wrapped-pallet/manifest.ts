import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Shrink-wrapped pallet',
  summary:
    'A wooden pallet stacked with boxes and wound in clear stretch film, with a shipping label and a warning sticker. Goods in transit, warehouses, deliveries and returns, moving on, anonymous abundance, something waiting to be claimed.',
  scales: ['room', 'street', 'tabletop'],
});
