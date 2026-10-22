import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Parcel box tower',
  summary:
    'A teetering tower of delivery boxes, most still taped shut with their printed shipping labels on, a few crushed at the base. Online shopping as comfort, late-night orders, hoarding, moving day, things bought and never met, the doorbell as the only visitor.',
  scales: ['room', 'street', 'tabletop'],
});
