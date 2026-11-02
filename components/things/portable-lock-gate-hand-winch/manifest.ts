import { defineManifest } from '@conjure/kit';
export default defineManifest({
  kind: 'thing',
  title: 'Portable lock-gate hand winch',
  summary: 'A heavy portable geared hand winch with a cable drum, removable crank, ratchet pawl and bolted timber feet. Hauling a lock gate into place, slow mechanical advantage and waterside repair crews.',
  scales: [
    'street',
    'room',
    'tabletop'
  ]
});
