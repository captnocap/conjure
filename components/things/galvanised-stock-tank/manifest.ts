import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Galvanised stock tank',
  summary:
    'A round galvanised steel water tank with corrugated sides, a float valve on a pipe, a scum line inside and a ring of hoof-churned mud around it; full or dry, clear or green with algae, something floating, a cow or an alien grazer with its head down to drink. Ranches, farms, trailer lots, backyard pools for the broke, the only water for miles.',
  scales: ['landscape', 'street', 'room', 'tabletop'],
});
