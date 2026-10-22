import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Jet fuel bowser',
  summary:
    'An airport refuelling tanker: a long oval tank on a truck chassis with hose reels, a rear lift platform, hazard diamonds and a grounding cable. Turnarounds, the smell of kerosene at dawn, careful dangerous routine, oil-company colours from another decade.',
  scales: ['street', 'landscape'],
});
