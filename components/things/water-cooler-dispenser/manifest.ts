import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Water cooler with cone cups',
  summary:
    'A bottle-topped water dispenser with hot and cold taps, a drip tray, a tube of paper cone cups on its side and a bubble that glugs up through the bottle now and then. Offices, clinics, car showrooms and staff rooms: gossip, a pause in a hard conversation, something to do with your hands while you wait.',
  scales: ['room', 'tabletop'],
});
