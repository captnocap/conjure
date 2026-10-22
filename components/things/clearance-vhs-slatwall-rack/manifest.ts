import { defineManifest } from '@conjure/kit';

export default defineManifest({
  kind: 'thing',
  title: 'Clearance video rental rack',
  summary:
    'A slanted rental-shop rack of face-out VHS and DVD cases under a genre header, with gaps where stock has sold and clearance stickers on what is left. Friday nights choosing a film, video shops closing down, a dying format, the last picked-over titles nobody wanted.',
  scales: ['room', 'street', 'tabletop'],
});
