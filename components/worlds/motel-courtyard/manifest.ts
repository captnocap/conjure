import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'world',
  title: 'Motel courtyard',
  summary: 'A horseshoe motel courtyard with numbered rooms, parking stripes and pool or dry planter, night arrivals, highway travel and temporary shelter.',
  scales: ['street', 'room', 'tabletop'],
});
