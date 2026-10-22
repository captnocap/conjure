import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Drive-thru cashier',
  summary:
    'A fast-food worker in a visor, polo shirt and headset mic, leaning out of a sliding pickup window or standing at a counter, holding out a paper bag, a tray or a drink carrier. Service with a tired smile, teenage first jobs, patience, late shifts, the small ritual of being handed your food.',
  scales: ['street', 'room', 'tabletop'],
});
