import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Locker door taped with family photos',
  summary:
    'A tall steel locker whose door is taped with family photos, a child\'s crayon drawing, a dried flower and a note from home. Barracks, ships, space stations, gyms and schools; homesickness, deployment, counting the days, the private corner of a shared place, someone packing up to go home or never coming back.',
  scales: ['room', 'street', 'tabletop'],
});
