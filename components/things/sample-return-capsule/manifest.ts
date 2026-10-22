import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Sample return capsule',
  summary:
    'A blunt cone capsule the size of a kettle drum, its heat shield charred, holding a sealed sample canister and a blinking recovery beacon. Something precious sent home across a great distance: delivery, quarantine, a message in a bottle, the thing you must not open.',
  scales: ['tabletop', 'room', 'street', 'landscape', 'planetary'],
});
